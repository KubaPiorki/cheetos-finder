const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/fastmog.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Enable WAL mode for better concurrency
db.run('PRAGMA journal_mode = WAL');

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users/Keys table
      db.run(`
        CREATE TABLE IF NOT EXISTS keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_value TEXT UNIQUE NOT NULL,
          key_hash TEXT UNIQUE NOT NULL,
          is_admin INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          first_ip TEXT,
          current_ip TEXT,
          is_locked INTEGER DEFAULT 0,
          lock_until DATETIME,
          status TEXT DEFAULT 'active'
        )
      `);

      // License table
      db.run(`
        CREATE TABLE IF NOT EXISTS licenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_id INTEGER NOT NULL UNIQUE,
          days_valid INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          status TEXT DEFAULT 'active',
          FOREIGN KEY(key_id) REFERENCES keys(id) ON DELETE CASCADE
        )
      `);

      // Players/Leaks database
      db.run(`
        CREATE TABLE IF NOT EXISTS player_leaks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nickname TEXT NOT NULL UNIQUE,
          ip_address TEXT NOT NULL,
          ip_hash TEXT NOT NULL,
          status TEXT DEFAULT 'timeout',
          added_by_key_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(added_by_key_id) REFERENCES keys(id) ON DELETE SET NULL
        )
      `);

      // Audit log for security
      db.run(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_id INTEGER,
          action TEXT NOT NULL,
          ip_address TEXT,
          status TEXT,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(key_id) REFERENCES keys(id) ON DELETE SET NULL
        )
      `);

      // IP Reset log
      db.run(`
        CREATE TABLE IF NOT EXISTS ip_resets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_id INTEGER NOT NULL UNIQUE,
          reset_count INTEGER DEFAULT 1,
          last_reset_at DATETIME,
          old_ip TEXT,
          FOREIGN KEY(key_id) REFERENCES keys(id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance and security
      db.run('CREATE INDEX IF NOT EXISTS idx_keys_key_value ON keys(key_value)');
      db.run('CREATE INDEX IF NOT EXISTS idx_keys_key_hash ON keys(key_hash)');
      db.run('CREATE INDEX IF NOT EXISTS idx_licenses_key_id ON licenses(key_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_player_leaks_ip ON player_leaks(ip_address)');
      db.run('CREATE INDEX IF NOT EXISTS idx_player_leaks_nickname ON player_leaks(nickname)');
      db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_key_id ON audit_log(key_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)');

      // Insert admin key on first run
      const adminKey = process.env.ADMIN_KEY || 'fastmog-larpik';

      db.get('SELECT COUNT(*) as count FROM keys WHERE is_admin = 1', (err, row) => {
        if (err) {
          console.error('Error checking admin key:', err);
          reject(err);
          return;
        }

        if (row.count === 0) {
          bcrypt.hash(adminKey, 10, (err, hash) => {
            if (err) {
              console.error('Error hashing admin key:', err);
              reject(err);
              return;
            }

            db.run(
              'INSERT INTO keys (key_value, key_hash, is_admin, status) VALUES (?, ?, 1, ?)',
              [adminKey, hash, 'active'],
              function(insertErr) {
                if (insertErr) {
                  console.error('Error inserting admin key:', insertErr);
                  reject(insertErr);
                } else {
                  console.log('✅ Admin key initialized: fastmog-larpik');
                  resolve();
                }
              }
            );
          });
        } else {
          console.log('✅ Admin key already exists');
          resolve();
        }
      });
    });
  });
};

module.exports = {
  db,
  initializeDatabase
};
