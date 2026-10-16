import { runWorkflow, WorkflowInputError } from '../../../lib/workflow-engine';

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > 300_000) return Response.json({ error: 'The request is too large. Keep your combined text under 80,000 characters.' }, { status: 413 });
    const body = await request.text();
    if (body.length > 300_000) return Response.json({ error: 'The request is too large. Keep your combined text under 80,000 characters.' }, { status: 413 });
    let payload: unknown;
    try { payload = JSON.parse(body); }
    catch { return Response.json({ error: 'Send a valid JSON request with projectId and inputs.' }, { status: 400 }); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return Response.json({ error: 'Send a JSON object with projectId and inputs.' }, { status: 400 });
    const { projectId, inputs } = payload as Record<string, unknown>;
    return Response.json(runWorkflow(projectId, inputs), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof WorkflowInputError) return Response.json({ error: error.message }, { status: 400 });
    console.error('Local workflow failed:', error instanceof Error ? error.name : 'Unknown error');
    return Response.json({ error: 'The workflow could not finish. Check the input format and try again.' }, { status: 500 });
  }
}
