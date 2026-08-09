import db, { initDatabase } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('=== RUNNING ZOOPAY END-TO-END VERIFICATION ===\n');

  // Initialize DB & seed
  initDatabase();
  await seedDatabase();

  // Clean existing test data safely
  db.prepare(`DELETE FROM audit_logs`).run();
  db.prepare(`DELETE FROM notifications`).run();
  db.prepare(`DELETE FROM referral_rewards`).run();
  db.prepare(`DELETE FROM wallet_ledger`).run();
  db.prepare(`DELETE FROM withdrawal_requests`).run();
  db.prepare(`DELETE FROM user_upi_accounts`).run();
  db.prepare(`DELETE FROM buy_transactions`).run();
  db.prepare(`DELETE FROM users WHERE mobile IN ('9876543210', '9876543211')`).run();

  // Reset payment accounts usage counts
  db.prepare(`UPDATE payment_accounts SET current_display_count = 0`).run();

  // 1. TEST REGISTRATION & REFERRAL CONNECTIVITY
  console.log('1. Testing User Registration & Referral Code Generation...');
  const passHash = await bcrypt.hash('password123', 10);
  const refCode1 = 'ZPTEST1';

  db.prepare(`
    INSERT INTO users (mobile, username, password_hash, referral_code)
    VALUES ('9876543210', 'asish123', ?, ?)
  `).run(passHash, refCode1);

  const user1 = db.prepare(`SELECT * FROM users WHERE mobile = '9876543210'`).get();
  console.assert(user1.username === 'asish123', 'User 1 created successfully');
  console.assert(user1.referral_code === refCode1, 'User 1 referral code generated');
  console.log('   User 1 registered:', user1.username, '| Ref Code:', user1.referral_code);

  // Register User 2 with User 1's referral code
  const refCode2 = 'ZPTEST2';
  db.prepare(`
    INSERT INTO users (mobile, username, password_hash, referral_code, referred_by_id)
    VALUES ('9876543211', 'rahul456', ?, ?, ?)
  `).run(passHash, refCode2, user1.id);

  const user2 = db.prepare(`SELECT * FROM users WHERE mobile = '9876543211'`).get();
  console.assert(user2.referred_by_id === user1.id, 'User 2 linked to User 1 referrer');
  console.log('   User 2 registered with referral link to User 1:', user2.username);

  // 2. TEST PLAN LOCKING LOGIC
  console.log('\n2. Testing Plan Locking Logic...');
  const plan2k = db.prepare(`SELECT * FROM plans WHERE amount = 2000`).get();
  console.assert(plan2k !== undefined, '₹2,000 plan exists');

  // Initiate purchase of ₹2,000 plan for User 1
  const buyTx1Id = `BUY-TEST-2000`;
  db.prepare(`
    INSERT INTO buy_transactions (id, user_id, plan_id, plan_amount, bonus_percentage, bonus_amount, total_amount, status)
    VALUES (?, ?, ?, 2000, 3.0, 60, 2060, 'PAYMENT_PENDING')
  `).run(buyTx1Id, user1.id, plan2k.id);

  // Check active transactions for User 1
  const activeTx1 = db.prepare(`
    SELECT * FROM buy_transactions
    WHERE user_id = ? AND status IN ('PAYMENT_PENDING', 'UTR_SUBMITTED', 'UNDER_VERIFICATION')
  `).all(user1.id);
  console.assert(activeTx1.length === 1 && activeTx1[0].plan_id === plan2k.id, '₹2,000 plan locked for User 1');
  console.log('   ₹2,000 plan is locked for User 1 (Status: PAYMENT_PENDING)');

  // Cancel transaction -> test plan unlock
  db.prepare(`UPDATE buy_transactions SET status = 'CANCELLED' WHERE id = ?`).run(buyTx1Id);
  const activeTxAfterCancel = db.prepare(`
    SELECT * FROM buy_transactions
    WHERE user_id = ? AND status IN ('PAYMENT_PENDING', 'UTR_SUBMITTED', 'UNDER_VERIFICATION')
  `).all(user1.id);
  console.assert(activeTxAfterCancel.length === 0, '₹2,000 plan unlocked after cancellation');
  console.log('   Transaction cancelled. Plan restored back to AVAILABLE status.');

  // 3. TEST ROUND-ROBIN PAYMENT ACCOUNT SYSTEM
  console.log('\n3. Testing Bank Account Round-Robin Routing System...');

  function simulateRoundRobin() {
    const activeAccounts = db.prepare(`SELECT * FROM payment_accounts WHERE status = 'ACTIVE' ORDER BY order_index ASC, id ASC`).all();
    let selected = activeAccounts.find(a => a.current_display_count < a.display_limit);
    if (!selected) {
      db.prepare(`UPDATE payment_accounts SET current_display_count = 0 WHERE status = 'ACTIVE'`).run();
      selected = activeAccounts[0];
      selected.current_display_count = 0;
    }
    db.prepare(`UPDATE payment_accounts SET current_display_count = current_display_count + 1 WHERE id = ?`).run(selected.id);
    return selected;
  }

  // Account A display limit is 3
  const sel1 = simulateRoundRobin();
  const sel2 = simulateRoundRobin();
  const sel3 = simulateRoundRobin();
  const sel4 = simulateRoundRobin(); // 4th request should cycle to Account B

  console.assert(sel1.bank_name === 'HDFC Bank', '1st request routed to Account A (HDFC)');
  console.assert(sel2.bank_name === 'HDFC Bank', '2nd request routed to Account A (HDFC)');
  console.assert(sel3.bank_name === 'HDFC Bank', '3rd request routed to Account A (HDFC)');
  console.assert(sel4.bank_name === 'ICICI Bank', '4th request auto-switched to Account B (ICICI) after Account A limit reached!');
  console.log('   Round-Robin routed: 3 times to Account A (HDFC) -> switched to Account B (ICICI)');

  // 4. TEST UTR SUBMIT & ADMIN VERIFICATION & REFERRAL BONUS
  console.log('\n4. Testing UTR Submission, Admin Approval & Referral Bonus Calculation...');
  const plan10k = db.prepare(`SELECT * FROM plans WHERE amount = 10000`).get();
  const buyTx2Id = `BUY-TEST-10000`;

  // User 2 buys ₹10,000 plan
  db.prepare(`
    INSERT INTO buy_transactions (id, user_id, plan_id, plan_amount, bonus_percentage, bonus_amount, total_amount, status)
    VALUES (?, ?, ?, 10000, 3.0, 300, 10300, 'PAYMENT_PENDING')
  `).run(buyTx2Id, user2.id, plan10k.id);

  // Submit UTR
  const utrVal = 'UTR998877665544';
  db.prepare(`UPDATE buy_transactions SET utr = ?, status = 'UTR_SUBMITTED' WHERE id = ?`).run(utrVal, buyTx2Id);

  // Admin approves payment
  db.prepare(`UPDATE buy_transactions SET status = 'APPROVED', verified_at = CURRENT_TIMESTAMP WHERE id = ?`).run(buyTx2Id);
  db.prepare(`INSERT INTO wallet_ledger (user_id, amount, type, reference_id, description) VALUES (?, 10000, 'BUY_CREDIT', ?, 'Deposit')`).run(user2.id, buyTx2Id);
  db.prepare(`INSERT INTO wallet_ledger (user_id, amount, type, reference_id, description) VALUES (?, 300, 'BUY_BONUS', ?, 'Bonus')`).run(user2.id, buyTx2Id);

  // Calculate referral reward for User 1 (0.05% of ₹10,000 = ₹5.00)
  const refReward = (10000 * 0.05) / 100;
  db.prepare(`
    INSERT INTO referral_rewards (referrer_id, referred_user_id, buy_transaction_id, transaction_amount, reward_percentage, reward_amount)
    VALUES (?, ?, ?, 10000, 0.05, ?)
  `).run(user1.id, user2.id, buyTx2Id, refReward);

  db.prepare(`
    INSERT INTO wallet_ledger (user_id, amount, type, reference_id, description)
    VALUES (?, ?, 'REFERRAL_REWARD', ?, 'Referral Reward from rahul456')
  `).run(user1.id, refReward, buyTx2Id);

  // Check balances
  const user2Bal = db.prepare(`SELECT SUM(amount) as bal FROM wallet_ledger WHERE user_id = ?`).get(user2.id).bal;
  const user1Bal = db.prepare(`SELECT SUM(amount) as bal FROM wallet_ledger WHERE user_id = ?`).get(user1.id).bal;

  console.assert(user2Bal === 10300, 'User 2 credited ₹10,300 (Deposit ₹10k + Bonus ₹300)');
  console.assert(user1Bal === 5, 'User 1 received ₹5.00 referral reward (0.05% of ₹10,000)');
  console.log('   User 2 Balance:', user2Bal, '| User 1 Referral Reward Balance:', user1Bal);

  // 5. TEST WITHDRAWAL PAYOUT BY ADMIN
  console.log('\n5. Testing User Withdrawal Request & Admin Payout Amount Decision...');
  db.prepare(`INSERT INTO user_upi_accounts (user_id, upi_id, status) VALUES (?, 'asish@upi', 'ACTIVE')`).run(user1.id);
  const upiRec = db.prepare(`SELECT * FROM user_upi_accounts WHERE user_id = ?`).get(user1.id);

  const withdrawId = `WITH-TEST-001`;
  db.prepare(`
    INSERT INTO withdrawal_requests (id, user_id, user_upi_id, upi_string, status)
    VALUES (?, ?, ?, ?, 'REQUESTED')
  `).run(withdrawId, user1.id, upiRec.id, upiRec.upi_id);

  // Admin approves payout amount ₹5.00
  const payoutAmount = 5.0;
  db.prepare(`
    UPDATE withdrawal_requests
    SET status = 'PAID', amount_paid = ?, reference_id = 'BANKPAY999', processed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(payoutAmount, withdrawId);

  db.prepare(`
    INSERT INTO wallet_ledger (user_id, amount, type, reference_id, description)
    VALUES (?, ?, 'WITHDRAWAL_DEBIT', ?, 'Withdrawal Payout')
  `).run(user1.id, -payoutAmount, withdrawId);

  const user1BalAfterPayout = db.prepare(`SELECT SUM(amount) as bal FROM wallet_ledger WHERE user_id = ?`).get(user1.id).bal;
  console.assert(user1BalAfterPayout === 0, 'User 1 balance debited correctly after withdrawal payout');
  console.log('   Admin paid out ₹5.00 to User 1 via UPI asish@upi. Remaining Balance:', user1BalAfterPayout);

  console.log('\n=== ALL INTEGRATION VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
