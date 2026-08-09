-- ZooPay Supabase / PostgreSQL Schema Initializer Script

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by_id INT REFERENCES users(id) ON DELETE SET NULL,
  bank_holder_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_name TEXT,
  bank_upi_id TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'SUPER_ADMIN',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  amount NUMERIC(12,2) NOT NULL,
  bonus_percentage NUMERIC(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. PAYMENT ACCOUNTS TABLE (ROUND-ROBIN ROUTING)
CREATE TABLE IF NOT EXISTS payment_accounts (
  id SERIAL PRIMARY KEY,
  account_holder TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc TEXT NOT NULL,
  upi_id TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  display_limit INT DEFAULT 5,
  current_display_count INT DEFAULT 0,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. BUY TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS buy_transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  plan_id INT NOT NULL REFERENCES plans(id),
  plan_amount NUMERIC(12,2) NOT NULL,
  bonus_percentage NUMERIC(5,2) NOT NULL,
  bonus_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  payment_account_id INT REFERENCES payment_accounts(id),
  utr TEXT,
  status VARCHAR(30) DEFAULT 'PAYMENT_PENDING',
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMPTZ
);

-- 6. USER UPI ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS user_upi_accounts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  upi_id TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. WITHDRAWAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  user_upi_id INT NOT NULL REFERENCES user_upi_accounts(id),
  upi_string TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'REQUESTED',
  amount_paid NUMERIC(12,2),
  reference_id TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);

-- 8. WALLET LEDGER TABLE
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. REFERRAL REWARDS TABLE
CREATE TABLE IF NOT EXISTS referral_rewards (
  id SERIAL PRIMARY KEY,
  referrer_id INT NOT NULL REFERENCES users(id),
  referred_user_id INT NOT NULL REFERENCES users(id),
  buy_transaction_id VARCHAR(50) REFERENCES buy_transactions(id),
  transaction_amount NUMERIC(12,2) NOT NULL,
  reward_percentage NUMERIC(5,2) NOT NULL,
  reward_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'INFO',
  is_read INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INT REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,
  target TEXT,
  previous_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR FAST PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_buy_user ON buy_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_buy_status ON buy_transactions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_rewards(referrer_id);
