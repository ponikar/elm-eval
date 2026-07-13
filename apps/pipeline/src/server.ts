import { createServer } from 'node:http';
import { runEvaluationJob } from './run-evaluation.js';

const PORT = Number(process.env['PORT'] ?? 4000);
const PIPELINE_SECRET = process.env['PIPELINE_SECRET'];

function sendJson(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function authenticate(req: import('node:http').IncomingMessage): boolean {
  if (!PIPELINE_SECRET) return true;
  return req.headers['x-pipeline-secret'] === PIPELINE_SECRET;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (req.method === 'POST' && url.pathname.startsWith('/run/')) {
    if (!authenticate(req)) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    const runId = url.pathname.slice('/run/'.length);
    if (!runId) {
      return sendJson(res, 400, { error: 'Missing run ID' });
    }

    console.log(`[server] Received run request for ${runId}`);

    sendJson(res, 202, { status: 'accepted', runId });

    runEvaluationJob(runId)
      .then(() => {
        console.log(`[server] Run ${runId} completed`);
      })
      .catch((error: unknown) => {
        console.error(`[server] Run ${runId} failed:`, error);
      });

    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[server] Pipeline HTTP server listening on port ${PORT}`);
});
