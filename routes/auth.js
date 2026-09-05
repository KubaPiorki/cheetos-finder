const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const { sanitizeInput, getClientIP } = require('../middleware/security');
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

  const sanitizedKey = key.trim();
  console.log(`🔐 Login attempt with key: ${sanitizedKey}`);

  // Query with parameterized query to prevent SQL injection
  db.get(
    'SELECT * FROM keys WHERE key_value = ? LIMIT 1',
    [sanitizedKey],
    (err, row) => {
      if (err) {
        console.error('❌ Database error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!row) {
        console.log(`❌ Login failed: Key not found - ${sanitizedKey}`);
        db.run(
          'INSERT INTO audit_log (action, ip_address, status, details) VALUES (?, ?, ?, ?)',
          ['login_failed', clientIP, 'failed', 'Key not found']
        );
        return res.status(401).json({ error: 'Klucz nie prawidłowy' });
      }

      console.log(`✅ Found key in DB: ${row.key_value}, admin: ${row.is_admin}`);

      // Check if key is locked
      if (row.is_locked && row.lock_until && new Date(row.lock_until) > new Date()) {
        console.log(`❌ Key is locked: ${sanitizedKey}`);
        return res.status(403).json({ error: 'Klucz jest zablokowany. Spróbuj później.' });
      }

      // Check if key is expired
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        console.log(`❌ Key expired: ${sanitizedKey}`);
        return res.status(403).json({ error: 'Klucz wygasł' });
      }

      // Verify key hash
      console.log(`🔍 Comparing key hash...`);
      bcrypt.compare(sanitizedKey, row.key_hash, (compareErr, isValid) => {
        if (compareErr) {
          console.error('❌ Hash comparison error:', compareErr);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!isValid) {
          console.log(`❌ Hash mismatch for key: ${sanitizedKey}`);
          db.run(
            'INSERT INTO audit_log (key_id, action, ip_address, status, details) VALUES (?, ?, ?, ?, ?)',
            [row.id, 'login_failed', clientIP, 'failed', 'Hash mismatch']
          );
          return res.status(401).json({ error: 'Klucz nie prawidłowy' });
        }

        console.log(`✅ Hash valid! Creating token...`);

        // Check IP binding only if not admin
        if (!row.is_admin && row.first_ip && row.first_ip !== clientIP) {
          console.log(`❌ IP mismatch: expected ${row.first_ip}, got ${clientIP}`);
          db.run(
            'INSERT INTO audit_log (key_id, action, ip_address, status, details) VALUES (?, ?, ?, ?, ?)',
            [row.id, 'login_failed', clientIP, 'failed', 'IP mismatch']
          );
          return res.status(403).json({ error: 'Klucz nie prawidłowy' });
        }

        // Bind IP on first login (only for non-admin)
        if (!row.is_admin && !row.first_ip) {
          db.run(
            'UPDATE keys SET first_ip = ?, current_ip = ? WHERE id = ?',
            [clientIP, clientIP, row.id]
          );
        }

        // Generate JWT token
        const token = jwt.sign(
          {
            keyId: row.id,
            is_admin: row.is_admin,
            iat: Math.floor(Date.now() / 1000)
          },
          process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production_at_least_32_characters',
          { expiresIn: process.env.TOKEN_EXPIRY || '24h' }
        );

        // Log successful login
        db.run(
          'INSERT INTO audit_log (key_id, action, ip_address, status) VALUES (?, ?, ?, ?)',
          [row.id, 'login_success', clientIP, 'success']
        );

        console.log(`✅ Login successful! Admin: ${row.is_admin}`);

        res.json({
          success: true,
          token,
          is_admin: row.is_admin === 1 || row.is_admin === true
        });
      });
    }
  );
});

// Generate new license key (admin only)
router.post('/generate-key', (req, res) => {
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
