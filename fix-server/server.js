const express = require('express');
const path = require('path');
const cors = require('cors');
const ping = require('ping');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the frontend UI inside fix-server/public
app.use(express.static(path.join(__dirname, 'public')));

// Explicit admin_login route
app.get('/admin_login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

// Simple GET ping endpoint: /api/ping?ip=1.2.3.4&timeout=5
app.get('/api/ping', async (req, res) => {
  const ip = req.query.ip;
  const timeout = parseInt(req.query.timeout || '5', 10);
  if (!ip) return res.status(400).json({ error: 'ip query parameter required' });
  try {
    const result = await ping.promise.probe(ip, { timeout });
    res.json({ ip, alive: result.alive, time: result.time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ping-multi { ips: [...], timeout: 5 }
// Runs pings in chunks to avoid overwhelming the server
app.post('/api/ping-multi', async (req, res) => {
  const ips = Array.isArray(req.body.ips) ? req.body.ips : [];
  const timeout = parseInt(req.body.timeout || '5', 10);
  if (!ips.length) return res.status(400).json({ error: 'ips array required in body' });

  const concurrency = parseInt(req.body.concurrency || '10', 10);

  const results = [];

  // helper to run a chunk
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

  // process in chunks
  for (let i = 0; i < ips.length; i += concurrency) {
    const chunk = ips.slice(i, i + concurrency);
    // eslint-disable-next-line no-await-in-loop
    await runChunk(chunk);
  }

  res.json(results);
});

// Fallback for SPA-like behavior inside this fix-server folder
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, err => {
    // if index.html doesn't exist, return 404
    if (err) res.status(404).send('Not found');
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fix server listening on http://localhost:${PORT}`);
});
