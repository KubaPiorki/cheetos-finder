const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/fastmog.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
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
      `, (err) => {
        if (err) console.error('Error creating keys table:', err);
      });

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
      `, (err) => {
        if (err) console.error('Error creating licenses table:', err);
      });

      // Players/Leaks database
      db.run(`
        CREATE TABLE IF NOT EXISTS player_leaks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nickname TEXT NOT NULL UNIQUE,
          ip_address TEXT NOT NULL,
          status TEXT DEFAULT 'timeout',
          added_by_key_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(added_by_key_id) REFERENCES keys(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) console.error('Error creating player_leaks table:', err);
      });

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
      `, (err) => {
        if (err) console.error('Error creating audit_log table:', err);
      });

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
      `, (err) => {
        if (err) console.error('Error creating ip_resets table:', err);
      });

      // Create indexes for better performance and security
      db.run('CREATE INDEX IF NOT EXISTS idx_keys_key_value ON keys(key_value)', (err) => {
        if (err && !err.message.includes('already exists')) console.error('Error creating index:', err);
      });
      db.run('CREATE INDEX IF NOT EXISTS idx_keys_key_hash ON keys(key_hash)', (err) => {
        if (err && !err.message.includes('already exists')) console.error('Error creating index:', err);
      });
      db.run('CREATE INDEX IF NOT EXISTS idx_licenses_key_id ON licenses(key_id)', (err) => {
        if (err && !err.message.includes('already exists')) console.error('Error creating index:', err);
      });
      db.run('CREATE INDEX IF NOT EXISTS idx_player_leaks_nickname ON player_leaks(nickname)', (err) => {
        if (err && !err.message.includes('already exists')) console.error('Error creating index:', err);
      });
      db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_key_id ON audit_log(key_id)', (err) => {
        if (err && !err.message.includes('already exists')) console.error('Error creating index:', err);
      });

      // Insert admin key on first run (ONLY IF IT DOESN'T EXIST)
      const adminKey = process.env.ADMIN_KEY || 'fastmog-larpik';

      // First, delete any existing admin keys to ensure fresh start
      db.run('DELETE FROM keys WHERE is_admin = 1', (err) => {
        if (err) console.error('Error deleting old admin key:', err);

        // Now insert the new admin key
        bcrypt.hash(adminKey, 10, (hashErr, hash) => {
          if (hashErr) {
            console.error('❌ Error hashing admin key:', hashErr);
            reject(hashErr);
            return;
          }

          db.run(
            'INSERT INTO keys (key_value, key_hash, is_admin, status) VALUES (?, ?, 1, ?)',
            [adminKey, hash, 'active'],
            function(insertErr) {
              if (insertErr) {
                console.error('❌ Error inserting admin key:', insertErr);
                reject(insertErr);
              } else {
                console.log('✅ Admin key initialized: fastmog-larpik');
                console.log(`   Hash: ${hash.substring(0, 20)}...`);
                resolve();
              }
            }
          );
        });
      });
    });
  });
};

module.exports = {
  db,
  initializeDatabase
};
