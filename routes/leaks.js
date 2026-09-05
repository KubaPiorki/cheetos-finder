const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { db } = require('../database/db');
const { verifyToken, verifyAdmin, getClientIP, validateIP } = require('../middleware/security');

const router = express.Router();

// Configure multer for file uploads with size limit
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Only allow .txt files
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'));
    }
  }
});

// Upload and parse leaks file
router.post('/upload', verifyToken, verifyAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    const keyId = req.user.keyId;
    const clientIP = getClientIP(req);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const line of lines) {
      // Split by colon instead of pipe
      const parts = line.split(':').map(p => p.trim());
      
      if (parts.length < 2) {
        errorCount++;
        errors.push(`Nieprawidłowy format: ${line}`);
        continue;
      }

      const nickname = parts[0];
      const ip = parts[1];

      // Validate inputs
      if (!nickname || nickname.length > 100) {
        errorCount++;
        errors.push(`Nieprawidłowy nick: ${nickname}`);
        continue;
      }

      if (!validateIP(ip)) {
        errorCount++;
        errors.push(`Nieprawidłowy IP: ${ip}`);
        continue;
      }

      // Use parameterized query to prevent SQL injection
      db.run(
        `INSERT OR IGNORE INTO player_leaks (nickname, ip_address, added_by_key_id, status)
         VALUES (?, ?, ?, ?)`,
        [nickname, ip, keyId, 'timeout'],
        (err) => {
          if (err) {
            console.error('Error inserting leak:', err);
            errorCount++;
            errors.push(`Błąd dodawania ${nickname}`);
          } else {
            successCount++;
          }
        }
      );
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Log the action
    db.run(
      'INSERT INTO audit_log (key_id, action, ip_address, details) VALUES (?, ?, ?, ?)',
      [keyId, 'leaks_uploaded', clientIP, `Uploaded ${successCount} entries`]
    );

    res.json({
      success: true,
      uploaded: successCount,
      failed: errorCount,
      errors: errors.slice(0, 10) // Return first 10 errors
    });

  } catch (err) {
    console.error('File processing error:', err);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to process file' });
  }
});

module.exports = router;
