const express = require('express');
const { build } = require('./scripts/prerender.js');

const PORT = process.env.PORT || 9100;
const INTERVAL_MINUTES = parseInt(process.env.PRERENDER_INTERVAL_MINUTES || '3', 10); // default every 3 minutes
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8099';
const OUTPUT_DIR = process.env.PRERENDER_OUT_DIR || '/usr/share/nginx/html/prerender';

process.env.BACKEND_URL = BACKEND_URL; // make available to prerender.js
process.env.PRERENDER_OUT_DIR = OUTPUT_DIR;

const app = express();
app.use(express.json());

let lastRun = null;
let running = false;

async function runPrerender(reason = 'scheduled') {
  if (running) {
    return { status: 'skipped', reason: 'already-running' };
  }
  running = true;
  const start = Date.now();
  try {
    await build();
    lastRun = new Date();
    const durationMs = Date.now() - start;
    console.log(`[prerender-sidecar] Completed prerender (${reason}) in ${durationMs}ms -> ${OUTPUT_DIR}`);
    running = false;
    return { status: 'ok', durationMs, lastRun };
  } catch (e) {
    console.error('[prerender-sidecar] Prerender failed:', e);
    running = false;
    return { status: 'error', error: String(e) };
  }
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ service: 'prerender-sidecar', status: 'healthy', lastRun });
});

// Manual trigger
app.post('/trigger', async (req, res) => {
  const result = await runPrerender('manual');
  res.json(result);
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({ running, lastRun, intervalMinutes: INTERVAL_MINUTES });
});

// Start interval loop
setInterval(() => {
  runPrerender('interval');
}, INTERVAL_MINUTES * 60 * 1000);

// Initial immediate run
runPrerender('startup');

app.listen(PORT, () => {
  console.log(`[prerender-sidecar] Listening on port ${PORT}, interval=${INTERVAL_MINUTES}m, backend=${BACKEND_URL}`);
});
