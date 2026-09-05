const express = require('express');
const path = require('path');
const ping = require('ping');

const app = express();
const PORT = process.env.PORT || 3000;

// Serwuj pliki statyczne (katalog projektu)
app.use(express.static(path.join(__dirname)));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Prosty, naiwne rate-limit na IP (in-memory) — tylko podstawowa ochrona przed abuzem
const rateMap = new Map(); // ip -> { count, windowStart }
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuta
const RATE_LIMIT_MAX = 60; // max 60 requestów na minutę

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // reset okna
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// Główna strona
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint pingujący IP po stronie serwera
app.get('/api/ping', async (req, res) => {
  const ip = req.query.ip;
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  if (!ip) return res.status(400).json({ error: 'no ip' });

  // podstawowa walidacja formatu IPv4
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return res.status(400).json({ error: 'invalid ip' });

  // prosty rate-limit
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  try {
    const result = await ping.promise.probe(ip, { timeout: 3 }); // timeout w sekundach
    const ping_ms = result.time && result.time !== 'unknown' ? Number(result.time) : null;
    return res.json({ ip, alive: !!result.alive, ping_ms });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Start serwera
app.listen(PORT, () => {
  console.log('🔥 Cheetos Finder działa na porcie ' + PORT);
  console.log('🌐 http://localhost:' + PORT);
});
