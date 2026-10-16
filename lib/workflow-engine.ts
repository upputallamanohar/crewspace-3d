import { getProject, type Project } from './projects';

export type WorkflowResult = {
  content: string;
  filename: string;
  mode: 'local';
  metrics: { inputCharacters: number; outputWords: number; steps: number };
};

export class WorkflowInputError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkflowInputError'; }
}

const MAX_FIELD = 50_000;
const MAX_TOTAL = 80_000;
const localNote = '> Built locally from your text using transparent rules and templates. No AI model, web research, or external actions were used.';

export function validateInputs(projectId: unknown, raw: unknown): { project: Project; inputs: Record<string, string> } {
  if (typeof projectId !== 'string') throw new WorkflowInputError('Choose a project before running a workflow.');
  const project = getProject(projectId);
  if (!project) throw new WorkflowInputError('This project does not exist. Choose one of the ten projects.');
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new WorkflowInputError('Inputs must be a named set of text fields.');
  const values = raw as Record<string, unknown>;
  const inputs: Record<string, string> = {};
  let total = 0;
  for (const field of project.fields) {
    const value = values[field.name];
    if (typeof value !== 'string' || !value.trim()) throw new WorkflowInputError(`Please fill in “${field.label}”.`);
    if (value.length > MAX_FIELD) throw new WorkflowInputError(`“${field.label}” is too long. Use fewer than ${MAX_FIELD.toLocaleString('en-US')} characters.`);
    const cleaned = value.trim().replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    if (!cleaned.trim()) throw new WorkflowInputError(`Please add readable text to “${field.label}”.`);
    if (field.options && !field.options.includes(cleaned)) throw new WorkflowInputError(`Choose a listed option for “${field.label}”.`);
    inputs[field.name] = cleaned;
    total += cleaned.length;
  }
  if (total > MAX_TOTAL) throw new WorkflowInputError('This workflow has too much text. Keep the combined inputs under 80,000 characters.');
  return { project, inputs };
}

const tableCell = (value: unknown) => String(value).replace(/\|/g, '\\|').replace(/\n/g, ' / ');
const bullet = (value: string) => `- ${value}`;
const short = (value: string, max = 220) => value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
const lines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);
const sentences = (value: string) => value.split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/).map((line) => line.trim()).filter(Boolean);
const points = (value: string, max = 8) => sentences(value).slice(0, max);
const unique = (values: string[]) => [...new Map(values.map((value) => [value.toLocaleLowerCase('en-US'), value])).values()];
const cleanPrefix = (value: string) => value.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '');
const listPhrases = (value: string) => unique(value.split(/\n|,/).map((phrase) => cleanPrefix(phrase.trim())).filter(Boolean));
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function evidence(text: string, phrase: string): { matched: boolean; snippet: string } {
  const pattern = new RegExp(`(^|[^a-z0-9])(${escapeRegExp(phrase).replace(/\s+/g, '\\s+')})(?=$|[^a-z0-9])`, 'ig');
  let match: RegExpExecArray | null;
  let negative = '';
  while ((match = pattern.exec(text))) {
    const index = match.index + match[1].length;
    const start = Math.max(text.lastIndexOf('\n', index - 1), text.lastIndexOf('.', index - 1), text.lastIndexOf(';', index - 1)) + 1;
    const preceding = text.slice(Math.max(start, index - 65), index).toLowerCase();
    const following = text.slice(index + match[2].length, index + match[2].length + 35).toLowerCase();
    const snippet = short(text.slice(start, Math.min(text.length, index + phrase.length + 115)).trim(), 170);
    const negated = /\b(?:no|not|never|without|lack|lacks|lacking|missing|unknown|unconfirmed|isn't|hasn't|haven't|don't|doesn't)\b/.test(preceding.replace(/\bnot only\b/g, '')) || /^\s*(?::|=|-)?\s*(?:no\b|not\b|unknown\b|unconfirmed\b|is missing\b|is not\b)/.test(following);
    if (!negated) return { matched: true, snippet };
    negative = snippet;
  }
  return { matched: false, snippet: negative ? `Not confirmed: ${negative}` : 'No explicit matching phrase in the supplied text.' };
}

function blog(v: Record<string, string>): string {
  const source = points(v.notes, 15);
  const bodyPoints = source.filter((point) => !/^sources?\s*:/i.test(point));
  const sections = ['Start with the essentials', 'Put the idea into practice', 'Make the next step clear'];
  const groups = sections.map((heading, i) => {
    const selected = bodyPoints.filter((_, index) => index % 3 === i);
    return `## ${heading}\n\n${selected.length ? selected.join('\n\n') : `For ${v.audience}, the next useful step is to identify a concrete example of ${v.topic.toLowerCase()} and explain how it applies. [Add a sourced example.]`}`;
  });
  const opening = v.tone === 'Warm & conversational'
    ? `Let’s make ${v.topic.toLowerCase()} a little easier to put into practice. If you’re part of ${v.audience.toLowerCase()}, start with one manageable change and use the notes below as a guide.`
    : v.tone === 'Professional & concise'
      ? `This draft examines ${v.topic.toLowerCase()} for ${v.audience.toLowerCase()}. It organizes the supplied material into practical considerations and next steps.`
      : `${v.topic} starts with a clear plan. For ${v.audience.toLowerCase()}, the most useful approach connects the idea to a small, specific action. Here is a practical starting point, based on your source notes.`;
  return `# ${v.topic}\n\n${localNote}\n\n**Audience:** ${v.audience}\n**Tone:** ${v.tone}\n**Status:** Editable draft; facts have not been independently verified.\n\n${opening}\n\n${groups.join('\n\n')}\n\n## A useful next step\n\nChoose one point above, define what success would look like for your audience, and decide when to review the result. Keep the first step small enough to follow through.\n\n## Editorial checks\n\n- Verify every factual claim and add direct source links before publishing.\n- Replace any bracketed prompt with an example from your own experience.\n- Check that the draft reflects your intended voice and audience.\n\n## Supplied source notes\n\n${source.map(bullet).join('\n')}`;
}

function competitors(v: Record<string, string>): string {
  const entries = lines(v.competitors).map((line) => {
    const [name, price, strength, ...gap] = line.split('|').map((part) => part.trim());
    return { name, price: price || 'Not supplied', strength: strength || 'Not supplied', gap: gap.join(' | ') || 'Not supplied' };
  });
  if (entries.length > 30) throw new WorkflowInputError('Compare up to 30 competitors at a time.');
  return `# Competitor comparison · ${v.company}\n\n${localNote}\n\n**Focus:** ${v.notes}\n**Coverage:** ${entries.length} competitor${entries.length === 1 ? '' : 's'} from your input. Prices and claims are supplied facts, not verified research.\n\n## Comparison matrix\n\n| Competitor | Stated price | Stated strength | Stated gap |\n| --- | --- | --- | --- |\n${entries.map((entry) => `| ${[entry.name, entry.price, entry.strength, entry.gap].map(tableCell).join(' | ')} |`).join('\n')}\n\n## Strategy worksheet\n\n| Lens | Evidence or question to explore |\n| --- | --- |\n| Strengths | What can ${tableCell(v.company)} already demonstrate against the strengths listed above? Your own product evidence is needed. |\n| Weaknesses | Compare onboarding, pricing terms, and reporting using the same task for every product. |\n| Opportunities | ${tableCell(entries.some((entry) => entry.gap !== 'Not supplied') ? `Investigate the supplied gaps: ${entries.filter((entry) => entry.gap !== 'Not supplied').map((entry) => `${entry.name}: ${entry.gap}`).join('; ')}. These are hypotheses to validate with customers.` : 'Add a known limitation for each competitor before drawing opportunity conclusions.')} |\n| Threats | ${tableCell(entries.some((entry) => entry.strength !== 'Not supplied') ? entries.filter((entry) => entry.strength !== 'Not supplied').map((entry) => `${entry.name} competes on ${entry.strength}`).join('; ') : 'Add competitor strengths before assessing threats.')} |\n\n## Next research steps\n\n- Open each official product and pricing page and record the date, plan limits, and billing term.\n- Verify the stated strengths and gaps with a consistent hands-on task.\n- Add source URLs and current release notes. No websites were fetched by this run.\n- Use the comparison focus to decide which differences matter to your customers.`;
}

function meeting(v: Record<string, string>): string {
  const utterances = sentences(v.transcript);
  const decisions = utterances.filter((line) => /\b(?:decided|agreed|approved|confirmed|we chose)\b|\bdecision\s*:/i.test(line));
  const actions = utterances.filter((line) => /\b(?:will|i'll|we'll|assigned|please)\b|\b(?:action(?: item)?|to-?do)\s*:/i.test(line));
  const actionRows = actions.map((line) => {
    const speaker = line.match(/^([^:]{1,45}):\s*/)?.[1];
    const body = line.replace(/^[^:]{1,45}:\s*/, '');
    const named = body.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:will|to)\b/)?.[1];
    const owner = named || (/\b(?:I will|I'll)\b/i.test(body) ? speaker : undefined) || 'Not specified';
    const due = body.match(/\b(?:by|due(?:\s+on)?|before)\s+([^.!?;]+?)(?=\s+(?:and|but)\s|[.!?;]|$)/i)?.[1]?.trim() || 'Not specified';
    return `| ${tableCell(owner)} | ${tableCell(body)} | ${tableCell(due)} |`;
  });
  const summary = unique(utterances).slice(0, 5);
  return `# ${v.title}\n\n${localNote}\n\n## Discussion summary\n\n${summary.map(bullet).join('\n')}\n\n*Extractive summary: these are the first ${summary.length} distinct transcript statements, not a judgment of importance.*\n\n## Action items\n\n${actionRows.length ? `| Owner stated in transcript | Action | Due phrase |\n| --- | --- | --- |\n${actionRows.join('\n')}` : 'No explicit commitments or action markers were found. Confirm the action owners and dates with the participants.'}\n\n## Explicit decisions\n\n${decisions.length ? decisions.map(bullet).join('\n') : 'No explicit “decided”, “agreed”, or “approved” statement was found.'}\n\n## Before sharing\n\n- Confirm that the extracted actions describe commitments, not suggestions.\n- Resolve relative dates such as “Friday” against the meeting date.\n- Fill in any missing owner or due date. No tasks or calendar events were created.`;
}

export function parseCsv(source: string): string[][] {
  const text = source.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false, closed = false;
  const pushValue = () => { row.push(value); value = ''; closed = false; };
  const pushRow = () => { const explicit = closed || row.length > 0; pushValue(); if (explicit || row.some((cell) => cell.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) {
      if (character === '"') {
        if (text[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closed = true; }
      } else value += character;
      continue;
    }
    if (character === ',') pushValue();
    else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[i + 1] === '\n') i++;
      pushRow();
    } else if (character === '"') {
      if (value || closed) throw new WorkflowInputError('CSV has an unexpected quote. Put quoted values inside a complete pair of double quotes.');
      quoted = true;
    } else if (closed) {
      if (!/\s/.test(character)) throw new WorkflowInputError('CSV has text after a closing quote. Add a comma or a line break after the quoted field.');
    } else value += character;
    if (rows.length > 10_000 || row.length > 100) throw new WorkflowInputError('Keep CSV data below 10,000 rows and 100 columns.');
  }
  if (quoted) throw new WorkflowInputError('CSV has an unclosed quoted field. Check the double quotes and try again.');
  if (value || row.length || closed) pushRow();
  if (rows.length < 2) throw new WorkflowInputError('Add a CSV header and at least one data row.');
  const headers = rows[0].map((header) => header.trim());
  if (headers.some((header) => !header)) throw new WorkflowInputError('Every CSV column needs a header name.');
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) throw new WorkflowInputError('CSV header names must be unique.');
  const mismatch = rows.findIndex((record) => record.length !== headers.length);
  if (mismatch !== -1) throw new WorkflowInputError(`CSV record ${mismatch + 1} has ${rows[mismatch].length} fields; the header has ${headers.length}. Check commas and quoted text.`);
  rows[0] = headers;
  return rows;
}

const numericValue = (value: string): number | undefined => {
  const clean = value.trim();
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(clean)) return undefined;
  const number = Number(clean);
  return Number.isFinite(number) ? number : undefined;
};
const formatNumber = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);

function data(v: Record<string, string>): string {
  const [headers, ...records] = parseCsv(v.csv);
  const stats = headers.map((header, index) => {
    const present = records.map((row) => row[index].trim()).filter(Boolean);
    const values = present.map(numericValue);
    const numbers = values.filter((value): value is number => value !== undefined);
    let sum = 0, correction = 0;
    for (const number of numbers) { const adjusted = number - correction; const next = sum + adjusted; correction = (next - sum) - adjusted; sum = next; }
    if (!Number.isFinite(sum)) throw new WorkflowInputError(`The numeric values in “${header}” are too large to total reliably. Use smaller units and try again.`);
    return { header, present: present.length, blank: records.length - present.length, values: numbers, numeric: numbers.length > 0 && numbers.length === present.length, mixed: numbers.length > 0 && numbers.length !== present.length, sum };
  });
  const numeric = stats.filter((stat) => stat.numeric);
  const blankCells = stats.reduce((sum, stat) => sum + stat.blank, 0);
  const duplicates = records.length - new Set(records.map((record) => JSON.stringify(record))).size;
  const primary = numeric.find((stat) => /revenue|sales|amount|total/i.test(stat.header)) || numeric[0];
  const findings = [
    `${records.length} data records and ${headers.length} columns were parsed. The header is excluded from the record count.`,
    primary ? `${primary.header}: total ${formatNumber(primary.sum)} across ${primary.values.length} populated numeric values; average ${formatNumber(primary.sum / primary.values.length)}.` : 'No column contains only numeric populated values. Add plain numeric values to calculate totals and averages.',
    `${blankCells} blank cell${blankCells === 1 ? '' : 's'} and ${duplicates} exact duplicate data record${duplicates === 1 ? '' : 's'} found. Duplicates remain included in the statistics.`,
  ];
  const numericRows = numeric.map((stat) => `| ${tableCell(stat.header)} | ${stat.values.length} | ${formatNumber(stat.sum)} | ${formatNumber(stat.sum / stat.values.length)} | ${formatNumber(Math.min(...stat.values))} | ${formatNumber(Math.max(...stat.values))} | ${stat.blank} |`);
  const mixed = stats.filter((stat) => stat.mixed).map((stat) => `“${stat.header}” has ${stat.values.length} numeric and ${stat.present - stat.values.length} other populated values; it was excluded from numeric statistics.`);
  return `# ${v.title}\n\n${localNote}\n\n## Three checked findings\n\n${findings.map((finding, i) => `${i + 1}. ${finding}`).join('\n')}\n\n## Numeric statistics\n\n${numericRows.length ? `| Column | Numeric count | Total | Average | Minimum | Maximum | Blank |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${numericRows.join('\n')}` : 'No fully numeric columns were found.'}\n\n## Data quality\n\n| Column | Populated | Blank | Type observed |\n| --- | ---: | ---: | --- |\n${stats.map((stat) => `| ${tableCell(stat.header)} | ${stat.present} | ${stat.blank} | ${stat.numeric ? 'Numeric' : stat.mixed ? 'Mixed; not totaled' : stat.present ? 'Text' : 'Empty'} |`).join('\n')}\n\n${mixed.map(bullet).join('\n')}\n\n## Calculation notes\n\n- Averages exclude blank cells; a literal zero is included.\n- Numeric totals use plain numbers as supplied, without assuming a currency or unit.\n- Values are displayed to at most six decimal places.\n- No trend, causality, or forecast is inferred from this table.`;
}

function support(v: Record<string, string>): string {
  const text = v.ticket.toLowerCase();
  const access = /\b(?:log[ -]?in|sign[ -]?in|password|locked out|account access|two.factor|2fa|reset link)\b/.test(text);
  const billing = /\b(?:billing|invoice|charged?|payment|refund|subscription|double charge|credit card|price)\b/.test(text);
  const category = access ? 'account_access' : billing ? 'billing' : 'other';
  const priority = category === 'other' ? 'Normal · review impact' : 'High · review promptly';
  const response = category === 'billing'
    ? `Thanks for flagging this billing issue. I understand your concern and would like to help the billing team review it. Please confirm the invoice or transaction reference and the date of the charge through our official support channel. Share only the last four digits of a payment method if our team specifically requests them; do not send a full card number. Once the details are verified, the team can explain the applicable next steps and any refund eligibility.`
    : category === 'account_access'
      ? `Thanks for letting us know you are having trouble accessing your account. Try the password-reset option on the official sign-in page and check your spam folder for the reset email. If that does not help, please reply through our official support channel with the exact error and the time it occurred. Do not share your password, one-time codes, or recovery codes. Our account support team can review the issue after verifying the account.`
      : `Thanks for getting in touch and explaining the issue. To help the support team investigate, please share the steps you took, what you expected to happen, and what happened instead. If this is a product suggestion, tell us what you are trying to achieve and how the change would help. You can include the device, browser, and any error message, with personal information removed.`;
  return `# Support response · ${v.customer}\n\n${localNote}\n\n## Suggested routing\n\n**Category:** ${category}\n**Priority:** ${priority}\n**Rule:** ${access ? 'Account-access terms take precedence over billing terms when both appear.' : billing ? 'The message contains a billing, payment, invoice, subscription, or refund term.' : 'No billing or account-access term matched; route to general support.'}\n\n## Ticket supplied\n\n${v.ticket}\n\n## Response draft\n\nHi ${v.customer},\n\n${response}\n\nThank you,\nCustomer Support\n\n## Before sending\n\n- Check the category and urgency against the complete ticket. Keyword routing can miss context.\n- Add the correct support links and organization-specific policy.\n- No account changes, refunds, ticket updates, or messages were sent.`;
}

function resume(v: Record<string, string>): string {
  const skills = listPhrases(v.requirements);
  if (!skills.length || skills.length > 50) throw new WorkflowInputError('Enter between 1 and 50 job-related skill phrases.');
  const checks = skills.map((skill) => ({ skill, ...evidence(v.resume, skill) }));
  const found = checks.filter((check) => check.matched);
  const missing = checks.filter((check) => !check.matched);
  const score = (found.length / skills.length) * 10;
  return `# Skills evidence review · ${v.role}\n\n${localNote}\n\n**Purpose:** Advisory job-skill text comparison for a human reviewer. This is not a hiring decision or a prediction of job performance.\n**Explicit phrase coverage:** ${found.length}/${skills.length} required phrases (${formatNumber(found.length / skills.length * 100)}%).\n**Coverage index:** ${formatNumber(score)}/10, calculated only from the fraction of matching skill phrases.\n**Review route:** ${score >= 7 ? 'Review the matched evidence and ask for concrete work examples.' : 'Clarify the skill phrases without explicit evidence before assessing fit.'}\n\n## Evidence matrix\n\n| Required skill phrase | Explicit evidence? | Supplied text excerpt |\n| --- | --- | --- |\n${checks.map((check) => `| ${tableCell(check.skill)} | ${check.matched ? 'Phrase found' : 'Not confirmed'} | ${tableCell(check.snippet)} |`).join('\n')}\n\n## Questions for a human-led skills conversation\n\n${found.slice(0, 4).map((check) => bullet(`Ask for a concrete work example involving ${check.skill}, including the person’s contribution.`)).join('\n')}\n${missing.slice(0, 6).map((check) => bullet(`Clarify experience with ${check.skill}; absence of a phrase does not establish absence of the skill.`)).join('\n')}\n\n## Review limits\n\n- Only the listed job-skill phrases are checked. Names, age, gender, location, and other personal attributes are not used.\n- Exact phrase matching can miss synonyms, abbreviations, and experience described in another way. It cannot verify proficiency.\n- A qualified person must assess the evidence, context, accommodations, and relevant job criteria.\n- No applicant was shortlisted, rejected, contacted, or given a final assessment.`;
}

function bugs(v: Record<string, string>): string {
  const combined = `${v.title}\n${v.issue}`;
  const isBug = /\b(?:bug|error|crash(?:es|ed)?|fail(?:s|ed|ure)?|broken|stops? responding|doesn't work|not working)\b/i.test(combined);
  const isFeature = /\b(?:feature|request|would like|please add|add support|enhancement)\b/i.test(combined);
  const route = isBug ? 'bug' : isFeature ? 'feature' : 'question';
  const impact = /\b(?:data loss|lost data|security breach|all users|production down|cannot access|can't access)\b/i.test(combined) && !/\bno data (?:is )?lost\b/i.test(combined);
  const severity = impact ? 'High — impact needs prompt verification' : /workaround/i.test(combined) ? 'Medium — workaround mentioned' : 'Unconfirmed — impact needs clarification';
  const suppliedSteps = lines(v.issue).filter((line) => /^\d+[.)]\s|^steps?\s*:/i.test(line));
  const detail = route === 'bug'
    ? `## Suggested bug triage\n\n**Proposed severity:** ${severity}\n\n### Supplied reproduction steps\n\n${suppliedSteps.length ? suppliedSteps.map(bullet).join('\n') : 'No numbered reproduction steps were supplied. Ask for a minimal reproducible sequence.'}\n\n### Checks for the maintainer\n\n- Reproduce the issue in the stated environment.\n- Confirm expected versus actual behavior and how many users are affected.\n- Verify any workaround before recommending it.\n\n### Tracker reply draft\n\nThanks for reporting “${v.title}”. We have captured the details below for review. Could you confirm the affected version, how often this occurs, and whether the supplied steps reproduce it consistently? The proposed label is bug; severity still needs a maintainer’s confirmation.`
    : route === 'feature'
      ? `## Feature request worksheet\n\n**User story:** As a user affected by “${v.title}”, I want the requested capability so I can complete the goal described in this request.\n\n**Source request:**\n${v.issue}\n\n**Acceptance criteria to define:**\n- The requested behavior is demonstrated with a concrete example.\n- Existing behavior remains usable.\n- A maintainer confirms scope, accessibility, and edge cases.\n\n### Tracker reply draft\n\nThanks for the suggestion. Please describe the current workaround, the people affected, and one example of your ideal experience. This will help the team assess “${v.title}” without assuming a delivery commitment.`
      : `## Question response worksheet\n\n**Question supplied:**\n${v.issue}\n\n### Reply draft\n\nThanks for the question about “${v.title}”. Please share the product version and the result you are trying to achieve. A maintainer should check the relevant documentation before providing an answer. No documentation was fetched in this run, so a product-specific answer has not been invented.`;
  return `# Issue triage · ${v.title}\n\n${localNote}\n\n**Suggested label:** ${route}\n**Routing rule:** Bug and error terms take precedence, followed by explicit feature-request terms; remaining issues become questions.\n\n${detail}\n\n## Original issue\n\n${v.issue}\n\n**Status:** Draft only. No labels, comments, or issue-tracker updates were posted.`;
}

function repurpose(v: Record<string, string>): string {
  if (/^https?:\/\/\S+$/i.test(v.article)) throw new WorkflowInputError('Paste the article text rather than a URL. This local workflow does not fetch web pages.');
  const source = points(v.article, 18);
  const core = source.slice(0, 3);
  const linkedin = `${v.title}\n\n${core.join('\n\n')}\n\nA useful next step: choose one idea from this article and try it in your own context.\n\nWhat would you put into practice first?`;
  const tweets = Array.from({ length: 6 }, (_, i) => {
    const content = source[i] || (i === 5 ? `Start small: pick one idea from “${v.title}” and decide how you will put it into practice.` : `Reflection: how does “${v.title}” apply to your work? Add an example from your own experience before publishing.`);
    return `${i + 1}/6 ${short(content, 270)}`;
  });
  const newsletterPoints = [0, 1, 2].map((index) => source[index] || 'Add a specific example from the source article before publishing.');
  return `# Content pack · ${v.title}\n\n${localNote}\n\nChannel drafts use excerpts from your article. Review the voice and context before publishing.\n\n## 1. LinkedIn post\n\n${linkedin}\n\n## 2. Six-part thread\n\n${tweets.join('\n\n')}\n\n## 3. Newsletter\n\n**Subject:** ${v.title}\n\nThis edition explores ${v.title.toLowerCase()}. Here are three points from the article to consider:\n\n${newsletterPoints.map(bullet).join('\n')}\n\nChoose the point most relevant to you, and share what you learn when you try it.\n\n---\n\n**Source handling:** This is a local excerpt-based content pack. No claims or source URLs were researched, and nothing was published.`;
}

function leads(v: Record<string, string>): string {
  const criteria = listPhrases(v.criteria);
  if (!criteria.length || criteria.length > 30) throw new WorkflowInputError('Enter between 1 and 30 explicit qualification phrases.');
  const checks = criteria.map((criterion) => ({ criterion, ...evidence(v.details, criterion) }));
  const matched = checks.filter((check) => check.matched).length;
  const score = matched / criteria.length * 100;
  const route = score >= 75 ? 'hot' : score >= 40 ? 'warm' : 'cold';
  const action = route === 'hot' ? 'Prepare a personal outreach draft for a person to review.' : route === 'warm' ? 'Review the missing criteria and consider a relevant nurture resource.' : 'Keep for manual review; confirm missing information before choosing follow-up.';
  const draft = route === 'hot'
    ? `Hi ${v.name},\n\nThanks for your interest. Based on the information shared about ${v.company}, I would like to learn more about your goals and confirm whether our solution is a fit. Would a short conversation be useful?\n\nBest,\nThe team`
    : route === 'warm'
      ? `Hi ${v.name},\n\nThanks for sharing the context about ${v.company}. Before suggesting a next step, could you clarify ${checks.filter((check) => !check.matched).map((check) => check.criterion).join(', ')}? This will help us share information that is relevant to your team.\n\nBest,\nThe team`
      : 'No outreach draft was generated for this route. Review the unknown criteria and decide whether any contact is appropriate.';
  return `# Lead review · ${v.company}\n\n${localNote}\n\n**Contact:** ${v.name}\n**Rule-based route:** ${route}\n**Criterion phrase coverage:** ${matched}/${criteria.length} (${formatNumber(score)}%).\n**Suggested action:** ${action}\n\n## Evidence against your criteria\n\n| Criterion phrase | Matched? | Supplied evidence |\n| --- | --- | --- |\n${checks.map((check) => `| ${tableCell(check.criterion)} | ${check.matched ? 'Yes' : 'Not confirmed'} | ${tableCell(check.snippet)} |`).join('\n')}\n\n## Transparent routing rules\n\n- Hot: at least 75% of your criterion phrases explicitly matched.\n- Warm: at least 40% and less than 75% matched.\n- Cold: less than 40% matched. Missing evidence is unknown, not proof of poor fit.\n- Matching is case-insensitive and phrase-based, with simple nearby negation checks. It does not understand all context; verify the evidence.\n\n## Follow-up draft\n\n${draft}\n\n## Lead notes supplied\n\n${v.details}\n\n**Status:** Advisory draft only. No website was enriched, no message sent, and no lead added to a list or archived.`;
}

function approval(v: Record<string, string>): string {
  const source = points(v.notes, 30);
  const proposals = source.filter((point) => /\b(?:propos(?:e|ed|al)|recommend|next step|should|could|plan to|pilot|suggest)\b/i.test(point));
  const facts = source.filter((point) => !proposals.includes(point));
  return `# ${v.topic}\n\n${localNote}\n\n**Audience:** ${v.audience}\n**Status:** DRAFT — awaiting a person’s review and approval.\n\n## Report overview\n\nThis report organizes the supplied material about ${v.topic.toLowerCase()} for ${v.audience.toLowerCase()}. Observations and proposed next steps are separated below for review. None of the supporting claims have been independently verified.\n\n## Supplied findings & evidence\n\n${facts.length ? facts.map(bullet).join('\n') : 'No separate factual findings were detected. Add confirmed observations and supporting sources.'}\n\n## Proposed next steps\n\n${proposals.length ? proposals.map(bullet).join('\n') : '- Ask the reviewer to define a decision, owner, and next review date after checking the supplied evidence.'}\n\n## Reviewer instructions / feedback\n\n${v.feedback}\n\n*The instructions above are attached verbatim for the reviewer. This template does not claim to have interpreted or applied arbitrary editorial feedback.*\n\n## Human approval checklist\n\n- [ ] Confirm every number, claim, source, and date.\n- [ ] Check whether the evidence and sample size support the conclusions.\n- [ ] Confirm that proposed actions are distinct from established findings.\n- [ ] Resolve the review instructions and make any editorial revisions.\n- [ ] Record an explicit approval decision before publishing.\n\n## Decision record\n\n**Reviewer:** ____________________\n**Decision:** Pending / Revise / Approved\n**Date:** ____________________\n**Revision notes:** ____________________\n\nThis run creates a reviewable draft. It does not approve or publish a report.`;
}

const handlers: Record<string, (inputs: Record<string, string>) => string> = { blog, competitors, meeting, data, support, resume, bugs, repurpose, leads, approval };

export function runWorkflow(projectId: unknown, rawInputs: unknown): WorkflowResult {
  const { project, inputs } = validateInputs(projectId, rawInputs);
  const content = handlers[project.id](inputs);
  return {
    content,
    filename: project.output,
    mode: 'local',
    metrics: { inputCharacters: Object.values(inputs).reduce((total, value) => total + value.length, 0), outputWords: content.split(/\s+/).length, steps: project.steps.length },
  };
}
