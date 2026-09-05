const express = require('express');
const { db } = require('../database/db');
const { verifyToken, sanitizeInput } = require('../middleware/security');

const router = express.Router();

// Search for player by nickname
router.get('/player/:nickname', verifyToken, (req, res) => {
  const nickname = sanitizeInput(req.params.nickname);

  if (!nickname || nickname.length === 0) {
    return res.status(400).json({ error: 'Invalid nickname' });
  }

  // Use parameterized query to prevent SQL injection
  db.get(
    `SELECT id, nickname, ip_address, status, created_at 
     FROM player_leaks 
     WHERE nickname = ? LIMIT 1`,
    [nickname],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.json({
        nickname: row.nickname,
        ip: row.ip_address,
        status: row.status, // 'ping' or 'timeout'
        added_at: row.created_at
      });
    }
  );
});

// Search by IP
router.get('/ip/:ip', verifyToken, (req, res) => {
  const ip = req.params.ip;
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  if (!ipRegex.test(ip)) {
    return res.status(400).json({ error: 'Invalid IP format' });
  }

  // Use parameterized query
  db.all(
    `SELECT id, nickname, ip_address, status, created_at 
     FROM player_leaks 
     WHERE ip_address = ? 
     ORDER BY created_at DESC 
     LIMIT 50`,
    [ip],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'No players found with this IP' });
      }

      res.json({
        results: rows.map(r => ({
          nickname: r.nickname,
          ip: r.ip_address,
          status: r.status,
          added_at: r.created_at
        }))
      });
    }
  );
});

module.exports = router;
