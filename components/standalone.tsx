import { createRoot } from 'react-dom/client';
import Home from '../app/page';
import { POST } from '../app/api/run/route';
import '../app/globals.css';

// The downloadable HTML runs the identical validated workflow code locally.
// Server deployments continue to use their real /api/run endpoint unchanged.
const originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(rawUrl, window.location.href);
  // An absolute file URL on Windows preserves its drive for /api/run, so also
  // recognize the exact relative endpoint used by the React application.
  if (rawUrl !== '/api/run' && url.pathname !== '/api/run') return originalFetch(input, init);

  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  if (method.toUpperCase() !== 'POST') {
    return Response.json({ error: 'Use POST to run a project.' }, { status: 405, headers: { Allow: 'POST' } });
  }

  const request = input instanceof Request
    ? new Request(input, init)
    : new Request('http://crewspace.local/api/run', init);
  return POST(request);
};

const root = document.getElementById('root');
if (!root) throw new Error('The Crewspace mounting point is missing.');
createRoot(root).render(<Home />);
