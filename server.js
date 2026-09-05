const express = require('express');
const path = require('path');
const cors = require('cors');
const ping = require('ping');

const app = express();
// Default port changed to 10000 per deployment request
const PORT = process.env.PORT || 10000;

// Enable CORS so frontend served via proxy/origin can call /api endpoints
app.use(cors());

// Serve static from public first so files like /js/ping.js (public/js/ping.js) are found
app.use(express.static(path.join(__dirname, 'public')));
// Also serve project root for legacy files (style.css, script.js at repo root)
app.use(express.static(path.join(__dirname)));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Parse JSON bodies for POST /api/ping-multi
app.use(express.json());

// Simple in-memory rate-limit per client IP
const rateMap = new Map(); // ip -> { count, windowStart }
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // max 60 requests per minute

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // reset window
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// Serve main page (prefer public/index.html if present)
app.get('/', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  if (require('fs').existsSync(publicIndex)) return res.sendFile(publicIndex);
  return res.sendFile(rootIndex);
});

// Admin login page — serve public/admin_login.html if present
app.get('/admin_login', (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin_login.html');
  if (require('fs').existsSync(adminPath)) return res.sendFile(adminPath);
  // fallback to root admin_login.html if exists
  const rootAdmin = path.join(__dirname, 'admin_login.html');
  if (require('fs').existsSync(rootAdmin)) return res.sendFile(rootAdmin);
  return res.status(404).send('admin_login not found');
});

// GET /api/ping?ip=1.2.3.4&timeout=3
app.get('/api/ping', async (req, res) => {
  const ip = req.query.ip;
  const clientIp = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';

  console.log('[api/ping] request from', clientIp, 'query:', req.query);

  if (!ip) return res.status(400).json({ error: 'no ip' });

  // basic IPv4 validation
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return res.status(400).json({ error: 'invalid ip' });

  if (isRateLimited(clientIp)) return res.status(429).json({ error: 'rate_limited' });

  try {
    const timeoutSec = parseInt(req.query.timeout || '3', 10);
    const result = await ping.promise.probe(ip, { timeout: timeoutSec });
    const ping_ms = result.time && result.time !== 'unknown' ? Number(result.time) : null;
    const response = { ip, alive: !!result.alive, ping_ms, raw: result };
    console.log('[api/ping] result for', ip, response);
    return res.json(response);
  } catch (err) {
    console.error('[api/ping] error', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/ping-multi { ips: [...], timeout: 3, concurrency: 10 }
app.post('/api/ping-multi', async (req, res) => {
  const ips = Array.isArray(req.body.ips) ? req.body.ips : [];
  const timeout = parseInt(req.body.timeout || '3', 10);
  if (!ips.length) return res.status(400).json({ error: 'ips array required in body' });

  const concurrency = parseInt(req.body.concurrency || '10', 10);
  const results = [];

  async function runChunk(chunk) {
    const promises = chunk.map(ip =>
      ping.promise
        .probe(ip, { timeout })
        .then(r => ({ ip, alive: r.alive, time: r.time }))
        .catch(e => ({ ip, error: e.message }))
    );
    const resolved = await Promise.all(promises);
    results.push(...resolved);
  }

  for (let i = 0; i < ips.length; i += concurrency) {
    const chunk = ips.slice(i, i + concurrency);
    // eslint-disable-next-line no-await-in-loop
    await runChunk(chunk);
  }

  console.log('[api/ping-multi] processed', ips.length, 'ips');
  res.json(results);
});

// Fallback 404
app.use((req, res) => res.status(404).send('Not found'));

app.listen(PORT, () => {
  console.log('🔥 Cheetos Finder działa na porcie ' + PORT);
  console.log('🌐 http://localhost:' + PORT);
});
