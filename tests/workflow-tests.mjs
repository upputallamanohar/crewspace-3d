import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const app = path.resolve(import.meta.dirname, '..');
const compiled = path.join(app, '.test-cache');
await mkdir(compiled, { recursive: true });
for (const [source, destination, replacement] of [
  ['lib/projects.ts', 'projects.mjs'],
  ['lib/workflow-engine.ts', 'workflow-engine.mjs', ["from './projects'", "from './projects.mjs'"]],
  ['app/api/run/route.ts', 'route.mjs', ["from '../../../lib/workflow-engine'", "from './workflow-engine.mjs'"]],
]) {
  let code = await readFile(path.join(app, source), 'utf8');
  if (replacement) code = code.replace(replacement[0], replacement[1]);
  await writeFile(path.join(compiled, destination), stripTypeScriptTypes(code));
}
const { projects } = await import(pathToFileURL(path.join(compiled, 'projects.mjs')));
const { runWorkflow, parseCsv } = await import(pathToFileURL(path.join(compiled, 'workflow-engine.mjs')));
const { POST } = await import(pathToFileURL(path.join(compiled, 'route.mjs')));

test('catalog contains exactly the ten original project IDs and usable sample inputs', () => {
  assert.deepEqual(projects.map((p) => p.id), ['blog', 'competitors', 'meeting', 'data', 'support', 'resume', 'bugs', 'repurpose', 'leads', 'approval']);
  for (const p of projects) for (const f of p.fields) assert.ok(p.sample[f.name]?.trim(), `${p.id}.${f.name}`);
});

for (const project of projects) {
  test(`${project.id}: useful sample output and input-specific behavior`, () => {
    const result = runWorkflow(project.id, project.sample);
    assert.equal(result.mode, 'local');
    assert.ok(result.content.length > 500);
    assert.match(result.content, /No AI model, web research, or external actions were used/);
    assert.ok(result.content.includes(project.sample[project.fields[0].name]));
    assert.ok(result.filename.endsWith('.md'));
    assert.equal(result.metrics.steps, project.steps.length);
    const changed = { ...project.sample, [project.fields[0].name]: 'Changed input: lunar cactus project' };
    const rerun = runWorkflow(project.id, changed);
    assert.notEqual(result.content, rerun.content);
    assert.ok(rerun.content.includes('Changed input: lunar cactus project'));
  });
}

test('CSV parser preserves quoted commas, escaped quotes, multiline cells, and CRLF', () => {
  assert.deepEqual(parseCsv('\uFEFFname,note,amount\r\n"A, B","First\r\nsecond",12.5\r\nC,"said ""hello""",0\r\n'), [
    ['name', 'note', 'amount'], ['A, B', 'First\r\nsecond', '12.5'], ['C', 'said "hello"', '0'],
  ]);
});

test('CSV statistics exclude blanks, include zero, handle mixed columns, and count duplicates', () => {
  const result = runWorkflow('data', { title: 'Checked totals', csv: 'item,revenue,discount,mixed\nA,10.5,0,3\nB,20.25,,oops\nC,,0,4\nA,10.5,0,3' });
  assert.match(result.content, /\| revenue \| 3 \| 41.25 \| 13.75 \| 10.5 \| 20.25 \| 1 \|/);
  assert.match(result.content, /\| discount \| 3 \| 0 \| 0 \| 0 \| 0 \| 1 \|/);
  assert.match(result.content, /2 blank cells and 1 exact duplicate data record/);
  assert.match(result.content, /mixed.*excluded from numeric statistics/);
});

test('CSV malformed input produces actionable errors', () => {
  for (const csv of ['a,b\n1,2,3', 'a,a\n1,2', 'a,b\n"oops,2', 'a,b\n"ok"garbage,2', ',b\n1,2', 'a,b']) {
    assert.throws(() => parseCsv(csv), { name: 'WorkflowInputError' });
  }
});

test('CSV preserves explicitly empty records and rejects overflowing totals', () => {
  assert.deepEqual(parseCsv('a,b\n,\n1,2'), [['a', 'b'], ['', ''], ['1', '2']]);
  assert.deepEqual(parseCsv('a\n""\n1'), [['a'], [''], ['1']]);
  assert.throws(() => runWorkflow('data', { title: 'Oversized numbers', csv: 'amount\n1e308\n1e308' }), /too large to total reliably/);
});

test('support routing changes with ticket and respects access priority', () => {
  const base = { customer: 'Alex' };
  assert.match(runWorkflow('support', { ...base, ticket: 'I was charged twice; please refund the payment.' }).content, /\*\*Category:\*\* billing/);
  assert.match(runWorkflow('support', { ...base, ticket: 'I cannot login after my payment.' }).content, /\*\*Category:\*\* account_access/);
  assert.match(runWorkflow('support', { ...base, ticket: 'Please add a dark theme to the dashboard.' }).content, /\*\*Category:\*\* other/);
});

test('resume scoring only uses job-skill evidence and rejects nearby negation', () => {
  const result = runWorkflow('resume', { role: 'Developer', requirements: 'React, TypeScript, C++', resume: 'I have no experience with React. I built a TypeScript service. I also use C++.' });
  assert.match(result.content, /\*\*Explicit phrase coverage:\*\* 2\/3/);
  assert.match(result.content, /\| React \| Not confirmed/);
  assert.match(result.content, /\| C\+\+ \| Phrase found/);
  assert.match(result.content, /not a hiring decision/);
});

test('meeting commitments retain supplied owners and due dates', () => {
  const result = runWorkflow('meeting', { title: 'Planning', transcript: 'Maya: I will update the guide by Friday.\nSam: We decided to use the short form.\nLeo: I will test the form by 22 October.' });
  assert.match(result.content, /\| Maya \| I will update the guide by Friday\. \| Friday \|/);
  assert.match(result.content, /\| Leo \| I will test the form by 22 October\. \| 22 October \|/);
  assert.match(result.content, /We decided to use the short form/);
});

test('meeting explicit action and decision markers work without a future-tense verb', () => {
  const result = runWorkflow('meeting', { title: 'Planning', transcript: 'Action: Maya to update the guide by Friday.\nDecision: Keep the current pricing.' });
  assert.match(result.content, /\| Maya \| Maya to update the guide by Friday/);
  assert.match(result.content, /## Explicit decisions\n\n- Decision: Keep the current pricing/);
});

test('bug route adapts to bug, feature and question inputs', () => {
  assert.match(runWorkflow('bugs', { title: 'Export', issue: 'Export failed with an error.' }).content, /\*\*Suggested label:\*\* bug/);
  assert.match(runWorkflow('bugs', { title: 'Dark theme', issue: 'Feature request: please add a dark theme.' }).content, /\*\*Suggested label:\*\* feature/);
  assert.match(runWorkflow('bugs', { title: 'Export format', issue: 'How do I choose the file format?' }).content, /\*\*Suggested label:\*\* question/);
});

test('content pack has all three requested channel sections and six short thread items', () => {
  const result = runWorkflow('repurpose', projects.find((p) => p.id === 'repurpose').sample);
  for (const section of ['## 1. LinkedIn post', '## 2. Six-part thread', '## 3. Newsletter']) assert.ok(result.content.includes(section));
  const tweets = result.content.split('\n').filter((line) => /^\d\/6 /.test(line));
  assert.equal(tweets.length, 6);
  for (const tweet of tweets) assert.ok(tweet.length <= 280);
  assert.throws(() => runWorkflow('repurpose', { title: 'Article', article: 'https://example.com/article' }), /Paste the article text/);
});

test('lead rules are transparent and react to supplied business evidence', () => {
  const base = { name: 'Jordan', company: 'Studio', criteria: 'Design agency\nBudget approved\nDemo requested\nProject planning' };
  assert.match(runWorkflow('leads', { ...base, details: 'Design agency. Budget approved. Demo requested. Needs project planning.' }).content, /\*\*Rule-based route:\*\* hot/);
  assert.match(runWorkflow('leads', { ...base, details: 'Design agency. Needs project planning. Budget approved: no. Demo requested: no.' }).content, /\*\*Rule-based route:\*\* warm/);
  assert.match(runWorkflow('leads', { ...base, details: 'A retail shop. No budget approved. No demo requested.' }).content, /\*\*Rule-based route:\*\* cold/);
});

test('approval report retains facts, proposals and feedback, and remains pending', () => {
  const result = runWorkflow('approval', { topic: 'Onboarding', audience: 'Team', notes: 'We reviewed 18 calls. A proposed next step is a five-person pilot.', feedback: 'Check the sample size.' });
  assert.match(result.content, /DRAFT — awaiting a person/);
  assert.match(result.content, /We reviewed 18 calls/);
  assert.match(result.content, /## Proposed next steps\n\n- A proposed next step is a five-person pilot/);
  assert.match(result.content, /Check the sample size/);
});

test('API validates unknown projects, missing fields, size and malformed requests', async () => {
  const request = (body) => new Request('http://localhost/api/run', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  assert.equal((await POST(request('{'))).status, 400);
  assert.equal((await POST(request({ projectId: 'not-real', inputs: {} }))).status, 400);
  assert.equal((await POST(request({ projectId: 'meeting', inputs: { title: 'Missing transcript' } }))).status, 400);
  assert.equal((await POST(request({ projectId: 'meeting', inputs: { title: 'Too long', transcript: 'a'.repeat(50_001) } }))).status, 400);
  assert.equal((await POST(request('a'.repeat(300_001)))).status, 413);
  const sample = projects.find((p) => p.id === 'data');
  const response = await POST(request({ projectId: 'data', inputs: sample.sample }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).mode, 'local');
});
