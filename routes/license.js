const express = require('express');
const { db } = require('../database/db');
const { verifyToken, verifyAdmin, getClientIP } = require('../middleware/security');

const router = express.Router();

// Get license info
router.get('/info', verifyToken, (req, res) => {
  const keyId = req.user.keyId;

  db.get(
    `SELECT k.*, l.days_valid, l.expires_at as license_expires 
     FROM keys k 
     LEFT JOIN licenses l ON k.id = l.key_id 
     WHERE k.id = ?`,
    [keyId],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'License not found' });
      }

      const now = new Date();
      let expiresAt = row.license_expires ? new Date(row.license_expires) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      
      // For admin key without license, set default expiry
      if (!row.license_expires) {
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
      
      const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      const daysValid = row.days_valid || 365;

      res.json({
        is_admin: row.is_admin,
        days_valid: daysValid,
        expires_at: expiresAt.toISOString(),
        days_remaining: Math.max(0, daysRemaining),
        status: row.status,
        created_at: row.created_at
      });
    }
  );
});

// Extend license (admin only)
router.post('/extend', verifyToken, verifyAdmin, (req, res) => {
  const { key_id, days } = req.body;
  const clientIP = getClientIP(req);

  if (!key_id || !days || typeof days !== 'number' || days < 1 || days > 365) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  db.get('SELECT expires_at FROM licenses WHERE key_id = ?', [key_id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'License not found' });
    }

    const currentExpires = new Date(row.expires_at);
    const newExpires = new Date(currentExpires.getTime() + days * 24 * 60 * 60 * 1000);

    db.run(
      'UPDATE licenses SET expires_at = ?, days_valid = days_valid + ? WHERE key_id = ?',
      [newExpires.toISOString(), days, key_id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to extend license' });
        }

        db.run(
          'INSERT INTO audit_log (key_id, action, ip_address, details) VALUES (?, ?, ?, ?)',
          [key_id, 'license_extended', clientIP, `Extended by ${days} days`]
        );

        res.json({ success: true, new_expires_at: newExpires });
      }
    );
  });
});

// Remove license (admin only)
router.delete('/remove/:key_id', verifyToken, verifyAdmin, (req, res) => {
  const keyId = req.params.key_id;
  const clientIP = getClientIP(req);

  if (isNaN(keyId)) {
    return res.status(400).json({ error: 'Invalid key ID' });
  }

  db.run('UPDATE licenses SET status = ? WHERE key_id = ?', ['deleted', keyId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to remove license' });
    }

    db.run('UPDATE keys SET status = ? WHERE id = ?', ['deleted', keyId]);

    db.run(
      'INSERT INTO audit_log (key_id, action, ip_address, details) VALUES (?, ?, ?, ?)',
      [keyId, 'license_removed', clientIP, 'License deleted']
    );

    res.json({ success: true });
  });
});

module.exports = router;
