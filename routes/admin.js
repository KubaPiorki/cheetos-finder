const express = require('express');
const { db } = require('../database/db');
const { verifyToken, verifyAdmin, getClientIP } = require('../middleware/security');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const router = express.Router();

// Reset IP for a key (admin only)
router.post('/reset-ip', verifyToken, verifyAdmin, (req, res) => {
  const { key_id } = req.body;
  const clientIP = getClientIP(req);

  if (!key_id || isNaN(key_id)) {
    return res.status(400).json({ error: 'Invalid key ID' });
  }

  // Check if key exists and get current IP
  db.get(
    'SELECT id, first_ip, current_ip FROM keys WHERE id = ?',
    [key_id],
    (err, row) => {
      if (err || !row) {
        return res.status(404).json({ error: 'Key not found' });
      }

      // Check if already reset
      db.get(
        'SELECT reset_count FROM ip_resets WHERE key_id = ?',
        [key_id],
        (err, resetRow) => {
          if (resetRow && resetRow.reset_count >= 1) {
            return res.status(403).json({ error: 'IP reset limit exceeded' });
          }

          // Reset IP (set first_ip to NULL so next login binds new IP)
          db.run(
            'UPDATE keys SET first_ip = NULL, current_ip = NULL WHERE id = ?',
            [key_id],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to reset IP' });
              }

              // Record the reset
              if (resetRow) {
                db.run(
                  'UPDATE ip_resets SET last_reset_at = ?, old_ip = ? WHERE key_id = ?',
                  [new Date().toISOString(), row.current_ip, key_id]
                );
              } else {
                db.run(
                  'INSERT INTO ip_resets (key_id, reset_count, last_reset_at, old_ip) VALUES (?, ?, ?, ?)',
                  [key_id, 1, new Date().toISOString(), row.current_ip]
                );
              }

              // Log the action
              db.run(
                'INSERT INTO audit_log (key_id, action, ip_address, details) VALUES (?, ?, ?, ?)',
                [key_id, 'ip_reset', clientIP, `Reset from ${row.current_ip}`]
              );

              res.json({
                success: true,
                message: 'IP reset successful. Key can be used with new IP on next login.'
              });
            }
          );
        }
      );
    }
  );
});

// Get all licenses (admin only)
router.get('/licenses', verifyToken, verifyAdmin, (req, res) => {
  db.all(
    `SELECT k.id, k.key_value, k.created_at, l.days_valid, l.expires_at, l.status, k.first_ip, k.status as key_status
     FROM keys k
     LEFT JOIN licenses l ON k.id = l.key_id
     WHERE k.is_admin = 0
     ORDER BY k.created_at DESC
     LIMIT 100`,
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      res.json({
        licenses: rows.map(r => ({
          key_id: r.id,
          key: r.key_value, // Only show to admin in secure session
          created_at: r.created_at,
          days_valid: r.days_valid,
          expires_at: r.expires_at,
          status: r.status,
          bound_ip: r.first_ip,
          key_status: r.key_status
        }))
      });
    }
  );
});

// Get audit log (admin only)
router.get('/audit-log', verifyToken, verifyAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);

  db.all(
    `SELECT id, key_id, action, ip_address, status, details, created_at
     FROM audit_log
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      res.json({ audit_log: rows });
    }
  );
});

module.exports = router;
