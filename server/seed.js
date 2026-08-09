import bcrypt from 'bcryptjs';
import db, { initDatabase } from './db.js';

export async function seedDatabase() {
  await initDatabase();

  // 1. System Settings
  const settings = [
    { key: 'signup_bonus_percent', value: '3' },
    { key: 'buy_bonus_percent', value: '3' },
    { key: 'referral_bonus_percent', value: '0.05' },
    { key: 'telegram_channel_link', value: 'https://t.me/zoopay_official' }
  ];

  const insertSetting = db.prepare(`
    INSERT INTO system_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
  `);

  for (const s of settings) {
    await insertSetting.run(s.key, s.value);
  }

  // 2. Admin User
  const adminCheck = await db.prepare(`SELECT * FROM admin_users WHERE username = ?`).get('admin');
  if (!adminCheck) {
    const adminPasswordHash = await bcrypt.hash('adminpassword123', 10);
    await db.prepare(`
      INSERT INTO admin_users (username, password_hash, role)
      VALUES (?, ?, ?)
    `).run('admin', adminPasswordHash, 'SUPER_ADMIN');
    console.log('Admin user created: admin / adminpassword123');
  }

  // 3. Default Buy Plans
  const existingPlansRow = await db.prepare(`SELECT COUNT(*) as count FROM plans`).get();
  const existingPlansCount = existingPlansRow ? parseInt(existingPlansRow.count) : 0;
  if (existingPlansCount === 0) {
    const plansData = [
      { amount: 500, bonus: 3.0 },
      { amount: 1000, bonus: 3.0 },
      { amount: 2000, bonus: 3.0 },
      { amount: 5000, bonus: 3.5 },
      { amount: 10000, bonus: 4.0 },
      { amount: 25000, bonus: 5.0 }
    ];

    const insertPlan = db.prepare(`
      INSERT INTO plans (amount, bonus_percentage, status)
      VALUES (?, ?, 'AVAILABLE')
    `);

    for (const p of plansData) {
      await insertPlan.run(p.amount, p.bonus);
    }
    console.log('Default buy plans seeded.');
  }

  // 4. Payment Accounts for Round-Robin
  const existingAccountsRow = await db.prepare(`SELECT COUNT(*) as count FROM payment_accounts`).get();
  const existingAccountsCount = existingAccountsRow ? parseInt(existingAccountsRow.count) : 0;
  if (existingAccountsCount === 0) {
    const accountsData = [
      {
        holder: 'ZooPay Prime Enterprise',
        bank: 'HDFC Bank',
        accNo: '50200012345678',
        ifsc: 'HDFC0001234',
        upi: 'zoopay.prime@hdfcbank',
        limit: 3,
        order: 1
      },
      {
        holder: 'ZooPay Financial Services',
        bank: 'ICICI Bank',
        accNo: '001105987654',
        ifsc: 'ICIC0000011',
        upi: 'zoopay.pay@icici',
        limit: 5,
        order: 2
      },
      {
        holder: 'ZooPay Digital Commerce',
        bank: 'Axis Bank',
        accNo: '921020045612389',
        ifsc: 'UTIB0000456',
        upi: 'zoopay.biz@axisbank',
        limit: 2,
        order: 3
      }
    ];

    const insertAccount = db.prepare(`
      INSERT INTO payment_accounts (account_holder, bank_name, account_number, ifsc, upi_id, display_limit, current_display_count, order_index, status)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE')
    `);

    for (const acc of accountsData) {
      await insertAccount.run(acc.holder, acc.bank, acc.accNo, acc.ifsc, acc.upi, acc.limit, acc.order);
    }
    console.log('Default payment accounts seeded for Round-Robin routing.');
  }

  // 5. SEED 3 TEST USERS & SAMPLE TRANSACTIONS
  const userCheckRow = await db.prepare(`SELECT COUNT(*) as count FROM users WHERE mobile IN ('9876543210', '9876543211', '9876543212')`).get();
  const userCheck = userCheckRow ? parseInt(userCheckRow.count) : 0;
  if (userCheck === 0) {
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    // User 1: Asish (Referrer, Balance: ₹2,065)
    await db.prepare(`
      INSERT INTO users (mobile, username, password_hash, referral_code, status)
      VALUES ('9876543210', 'asish123', ?, 'ZP10001', 'ACTIVE')
    `).run(defaultPasswordHash);

    const user1 = await db.prepare(`SELECT * FROM users WHERE mobile = '9876543210'`).get();

    // User 1 UPI
    await db.prepare(`INSERT INTO user_upi_accounts (user_id, upi_id, status) VALUES (?, 'asish@upi', 'ACTIVE')`).run(user1.id);

    // User 1 completed transaction (₹2,000 plan + ₹60 bonus = ₹2,060)
    const tx1Id = 'BUY-INIT-2000';
    await db.prepare(`
      INSERT INTO buy_transactions (id, user_id, plan_id, plan_amount, bonus_percentage, bonus_amount, total_amount, payment_account_id, utr, status, verified_at)
      VALUES (?, ?, 3, 2000, 3.0, 60, 2060, 1, 'UTR887766554433', 'APPROVED', CURRENT_TIMESTAMP)
    `).run(tx1Id, user1.id);

    await db.prepare(`INSERT INTO wallet_ledger (user_id, amount, type, reference_id, description) VALUES (?, 2000, 'BUY_CREDIT', ?, 'Deposit Plan Purchase ₹2,000')`).run(user1.id, tx1Id);
    await db.prepare(`INSERT INTO wallet_ledger (user_id, amount, type, reference_id, description) VALUES (?, 60, 'BUY_BONUS', ?, 'Buy Bonus (3%)')`).run(user1.id, tx1Id);

    // User 2: Rahul (Referred by Asish, Pending UTR Verification)
    await db.prepare(`
      INSERT INTO users (mobile, username, password_hash, referral_code, referred_by_id, status)
      VALUES ('9876543211', 'rahul456', ?, 'ZP10002', ?, 'ACTIVE')
    `).run(defaultPasswordHash, user1.id);

    const user2 = await db.prepare(`SELECT * FROM users WHERE mobile = '9876543211'`).get();

    // User 2 UPI
    await db.prepare(`INSERT INTO user_upi_accounts (user_id, upi_id, status) VALUES (?, 'rahul@okicici', 'ACTIVE')`).run(user2.id);

    // User 2 Pending Transaction (₹5,000 plan, status: UTR_SUBMITTED ready for Admin verification test!)
    const tx2Id = 'BUY-PENDING-5000';
    await db.prepare(`
      INSERT INTO buy_transactions (id, user_id, plan_id, plan_amount, bonus_percentage, bonus_amount, total_amount, payment_account_id, utr, status)
      VALUES (?, ?, 4, 5000, 3.5, 175, 5175, 2, 'UTR987654321012', 'UTR_SUBMITTED')
    `).run(tx2Id, user2.id);

    // Add referral reward for User 1 from a previous ₹10,000 transaction
    await db.prepare(`
      INSERT INTO referral_rewards (referrer_id, referred_user_id, buy_transaction_id, transaction_amount, reward_percentage, reward_amount)
      VALUES (?, ?, ?, 10000, 0.05, 5.0)
    `).run(user1.id, user2.id, tx1Id);

    await db.prepare(`INSERT INTO wallet_ledger (user_id, amount, type, reference_id, description) VALUES (?, 5.0, 'REFERRAL_REWARD', ?, 'Referral Reward (0.05%) from rahul456')`).run(user1.id, tx1Id);

    // User 3: Vikram (Clean User Account)
    await db.prepare(`
      INSERT INTO users (mobile, username, password_hash, referral_code, referred_by_id, status)
      VALUES ('9876543212', 'vikram789', ?, 'ZP10003', ?, 'ACTIVE')
    `).run(defaultPasswordHash, user1.id);

    const user3 = await db.prepare(`SELECT * FROM users WHERE mobile = '9876543212'`).get();
    await db.prepare(`INSERT INTO user_upi_accounts (user_id, upi_id, status) VALUES (?, 'vikram@ybl', 'ACTIVE')`).run(user3.id);

    console.log('Seeded test users successfully.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  seedDatabase().then(() => {
    console.log('Database seeding complete.');
    process.exit(0);
  }).catch((err) => {
    console.error('Database seeding failed:', err);
    process.exit(1);
  });
}
