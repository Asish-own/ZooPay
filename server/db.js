import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'zoopay.db');
const db = new Database(dbPath);

// Enable Foreign Keys & Write-Ahead Logging for safety and performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    -- USERS TABLE
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by_id INTEGER,
      bank_holder_name TEXT,
      bank_account_number TEXT,
      bank_ifsc TEXT,
      bank_name TEXT,
      bank_upi_id TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(referred_by_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- ADMIN USERS TABLE
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'SUPER_ADMIN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- PLANS TABLE
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      bonus_percentage REAL NOT NULL,
      status TEXT DEFAULT 'AVAILABLE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- PAYMENT ACCOUNTS TABLE (ROUND-ROBIN ROUTING)
    CREATE TABLE IF NOT EXISTS payment_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_holder TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      ifsc TEXT NOT NULL,
      upi_id TEXT,
      status TEXT DEFAULT 'ACTIVE',
      display_limit INTEGER DEFAULT 5,
      current_display_count INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- BUY TRANSACTIONS TABLE
    CREATE TABLE IF NOT EXISTS buy_transactions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      plan_amount REAL NOT NULL,
      bonus_percentage REAL NOT NULL,
      bonus_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      payment_account_id INTEGER,
      utr TEXT,
      status TEXT DEFAULT 'PAYMENT_PENDING',
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(plan_id) REFERENCES plans(id),
      FOREIGN KEY(payment_account_id) REFERENCES payment_accounts(id)
    );

    -- USER UPI ACCOUNTS TABLE
    CREATE TABLE IF NOT EXISTS user_upi_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      upi_id TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- WITHDRAWAL REQUESTS TABLE
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      user_upi_id INTEGER NOT NULL,
      upi_string TEXT NOT NULL,
      status TEXT DEFAULT 'REQUESTED',
      amount_paid REAL,
      reference_id TEXT,
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(user_upi_id) REFERENCES user_upi_accounts(id)
    );

    -- WALLET LEDGER TABLE
    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- REFERRAL REWARDS TABLE
    CREATE TABLE IF NOT EXISTS referral_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_user_id INTEGER NOT NULL,
      buy_transaction_id TEXT,
      transaction_amount REAL NOT NULL,
      reward_percentage REAL NOT NULL,
      reward_amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(referrer_id) REFERENCES users(id),
      FOREIGN KEY(referred_user_id) REFERENCES users(id),
      FOREIGN KEY(buy_transaction_id) REFERENCES buy_transactions(id)
    );

    -- SYSTEM SETTINGS TABLE
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- NOTIFICATIONS TABLE
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'INFO',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- AUDIT LOGS TABLE
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      action TEXT NOT NULL,
      target TEXT,
      previous_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(admin_id) REFERENCES admin_users(id)
    );

    -- INDEXES FOR FAST SEARCH
    CREATE INDEX IF NOT EXISTS idx_buy_user ON buy_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_buy_status ON buy_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON wallet_ledger(user_id);
    CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_rewards(referrer_id);
  `);

  // Ensure bank details columns exist on users table
  const userColumns = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
  if (!userColumns.includes('bank_holder_name')) {
    db.exec(`
      ALTER TABLE users ADD COLUMN bank_holder_name TEXT;
      ALTER TABLE users ADD COLUMN bank_account_number TEXT;
      ALTER TABLE users ADD COLUMN bank_ifsc TEXT;
      ALTER TABLE users ADD COLUMN bank_name TEXT;
      ALTER TABLE users ADD COLUMN bank_upi_id TEXT;
    `);
  }

  console.log('Database initialized successfully.');
}

export default db;
