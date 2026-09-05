const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const { sanitizeInput, getClientIP, validateIP } = require('../middleware/security');
const crypto = require('crypto');

const router = express.Router();

// Generate random key suffix
const generateKeySuffix = (length = 16) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

// Login with key
router.post('/login', (req, res) => {
  const { key } = req.body;
  const clientIP = getClientIP(req);

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'Invalid key format' });
  }

  const sanitizedKey = sanitizeInput(key).trim();

  // Query with parameterized query to prevent SQL injection
  db.get(
    'SELECT * FROM keys WHERE key_value = ? LIMIT 1',
    [sanitizedKey],
    async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        console.log(`❌ Login failed: Key not found - ${sanitizedKey}`);
        // Log failed attempt
        db.run(
          'INSERT INTO audit_log (action, ip_address, status, details) VALUES (?, ?, ?, ?)',
          ['login_failed', clientIP, 'failed', 'Invalid key']
        );
        return res.status(401).json({ error: 'Klucz nie prawidłowy' });
      }

      console.log(`🔍 Found key: ${row.key_value}, is_admin: ${row.is_admin}`);

      // Check if key is locked
      if (row.is_locked && new Date(row.lock_until) > new Date()) {
        return res.status(403).json({ error: 'Klucz jest zablokowany. Spróbuj później.' });
      }

      // Check if key is expired
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return res.status(403).json({ error: 'Klucz wygasł' });
      }

      // Verify key hash
      bcrypt.compare(sanitizedKey, row.key_hash, (compareErr, isValid) => {
        if (compareErr) {
          console.error('Hash comparison error:', compareErr);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!isValid) {
          console.log(`❌ Hash mismatch for key: ${sanitizedKey}`);
          db.run(
            'INSERT INTO audit_log (key_id, action, ip_address, status, details) VALUES (?, ?, ?, ?, ?)',
            [row.id, 'login_failed', clientIP, 'failed', 'Invalid hash']
          );
          return res.status(401).json({ error: 'Klucz nie prawidłowy' });
        }

        console.log(`✅ Hash valid for key: ${sanitizedKey}`);

        // Check IP binding
        if (row.first_ip && row.first_ip !== clientIP) {
          console.log(`❌ IP mismatch: expected ${row.first_ip}, got ${clientIP}`);
          db.run(
            'INSERT INTO audit_log (key_id, action, ip_address, status, details) VALUES (?, ?, ?, ?, ?)',
            [row.id, 'login_failed', clientIP, 'failed', 'IP mismatch']
          );
          return res.status(403).json({ error: 'Klucz nie prawidłowy' });
        }

        // Bind IP on first login
        if (!row.first_ip) {
          db.run(
            'UPDATE keys SET first_ip = ?, current_ip = ? WHERE id = ?',
            [clientIP, clientIP, row.id]
          );
        }

        // Generate JWT token (NO SENSITIVE DATA IN TOKEN)
        const token = jwt.sign(
          {
            keyId: row.id,
            is_admin: row.is_admin,
            iat: Math.floor(Date.now() / 1000)
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
        );

        // Log successful login
        db.run(
          'INSERT INTO audit_log (key_id, action, ip_address, status) VALUES (?, ?, ?, ?)',
          [row.id, 'login_success', clientIP, 'success']
        );

        console.log(`✅ Login successful for key: ${sanitizedKey}, admin: ${row.is_admin}`);

        res.json({
          success: true,
          token,
          is_admin: row.is_admin
        });
      });
    }
  );
});

// Generate new license key (admin only)
router.post('/generate-key', (req, res) => {
  // Verify admin would be done in middleware in full implementation
  const { days } = req.body;

  if (!days || typeof days !== 'number' || days < 1 || days > 365) {
    return res.status(400).json({ error: 'Invalid days value (1-365)' });
  }

  const newKey = `fastmog-${generateKeySuffix(10)}-${generateKeySuffix(8)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  bcrypt.hash(newKey, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: 'Key generation failed' });
    }

    db.run(
      'INSERT INTO keys (key_value, key_hash, expires_at, status) VALUES (?, ?, ?, ?)',
      [newKey, hash, expiresAt.toISOString(), 'active'],
      function(err) {
        if (err) {
          console.error('Error inserting key:', err);
          return res.status(500).json({ error: 'Failed to create key' });
        }

        const keyId = this.lastID;

        // Create license entry
        db.run(
          'INSERT INTO licenses (key_id, days_valid, expires_at, status) VALUES (?, ?, ?, ?)',
          [keyId, days, expiresAt.toISOString(), 'active']
        );

        res.json({
          success: true,
          key: newKey,
          expires_at: expiresAt,
          days_valid: days
        });
      }
    );
  });
});

module.exports = router;
