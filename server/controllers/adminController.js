import bcrypt from 'bcryptjs';
import db from '../db.js';
import { logAudit } from '../middleware/audit.js';

// --- ADMIN DASHBOARD STATS ---
export async function getAdminDashboardStats(req, res) {
  try {
    const userRow = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    const totalUsers = userRow ? parseInt(userRow.count) : 0;

    const totalDepositedRow = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM buy_transactions
      WHERE status = 'APPROVED'
    `).get();

    const totalWithdrawalsPaidRow = await db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as total
      FROM withdrawal_requests
      WHERE status = 'PAID'
    `).get();

    const buyCountRow = await db.prepare(`
      SELECT COUNT(*) as count FROM buy_transactions
      WHERE status IN ('UTR_SUBMITTED', 'UNDER_VERIFICATION')
    `).get();
    const pendingBuyCount = buyCountRow ? parseInt(buyCountRow.count) : 0;

    const withdrawCountRow = await db.prepare(`
      SELECT COUNT(*) as count FROM withdrawal_requests
      WHERE status IN ('REQUESTED', 'PROCESSING')
    `).get();
    const pendingWithdrawCount = withdrawCountRow ? parseInt(withdrawCountRow.count) : 0;

    const totalDeposited = parseFloat(totalDepositedRow?.total || 0);
    const totalWithdrawalsPaid = parseFloat(totalWithdrawalsPaidRow?.total || 0);
    const amountAvailableLeft = totalDeposited - totalWithdrawalsPaid;

    return res.json({
      stats: {
        totalUsers,
        totalDeposited,
        totalWithdrawalsPaid,
        amountAvailableLeft,
        pendingBuyVerification: pendingBuyCount,
        pendingWithdrawalRequests: pendingWithdrawCount
      }
    });
  } catch (err) {
    console.error('Admin dashboard stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
}

// --- USER MANAGEMENT ---
export async function getAllUsers(req, res) {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT
        u.id, u.mobile, u.username, u.referral_code as referralCode,
        u.status, u.created_at as createdAt,
        ref.username as referredByUsername,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_ledger WHERE user_id = u.id) as balance
      FROM users u
      LEFT JOIN users ref ON u.referred_by_id = ref.id
      WHERE 1=1
    `;

    const params = [];
    if (search && search.trim()) {
      query += ` AND (u.username LIKE ? OR u.mobile LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status && status !== 'ALL') {
      query += ` AND u.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY u.id DESC`;

    const users = await db.prepare(query).all(...params);
    const mappedUsers = users.map(u => ({
      ...u,
      balance: parseFloat(u.balance || 0)
    }));

    return res.json({ users: mappedUsers });
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'DEACTIVATED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid user status.' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

    logAudit(req.admin.id, 'TOGGLE_USER_STATUS', `User ID: ${id} (${user.username})`, { status: user.status }, { status }, req);

    return res.json({ message: `User status changed to ${status}.`, userId: id, status });
  } catch (err) {
    console.error('Toggle user status error:', err);
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
}

export async function resetUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, id);

    logAudit(req.admin.id, 'RESET_USER_PASSWORD', `User ID: ${id} (${user.username})`, null, null, req);

    return res.json({ message: `Password reset successfully for user ${user.username}.` });
  } catch (err) {
    console.error('Reset user password error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
}

// --- BUY PLAN MANAGEMENT (CRUD) ---
export async function getAdminPlans(req, res) {
  try {
    const plans = await db.prepare(`
      SELECT
        p.id, p.amount, p.bonus_percentage as bonusPercentage, p.status, p.created_at as createdAt,
        (
          SELECT COUNT(*) FROM buy_transactions
          WHERE plan_id = p.id AND status IN ('PAYMENT_PENDING', 'UTR_SUBMITTED', 'UNDER_VERIFICATION')
        ) as activeBuyersCount
      FROM plans p
      ORDER BY p.amount ASC
    `).all();

    const mappedPlans = plans.map(p => ({
      ...p,
      amount: parseFloat(p.amount || 0),
      bonusPercentage: parseFloat(p.bonusPercentage || 0),
      activeBuyersCount: parseInt(p.activeBuyersCount || 0)
    }));

    return res.json({ plans: mappedPlans });
  } catch (err) {
    console.error('Get admin plans error:', err);
    return res.status(500).json({ error: 'Failed to fetch buy plans.' });
  }
}

export async function createPlan(req, res) {
  try {
    const { amount, bonusPercentage } = req.body;

    const numAmount = parseFloat(amount);
    const numBonus = parseFloat(bonusPercentage);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid plan amount greater than 0.' });
    }

    if (isNaN(numBonus) || numBonus < 0) {
      return res.status(400).json({ error: 'Please enter a valid bonus percentage (0 or higher).' });
    }

    const result = await db.prepare(`
      INSERT INTO plans (amount, bonus_percentage, status)
      VALUES (?, ?, 'AVAILABLE')
    `).run(numAmount, numBonus);

    logAudit(req.admin.id, 'CREATE_BUY_PLAN', `Plan ID: ${result.lastInsertRowid}`, null, { amount: numAmount, bonusPercentage: numBonus }, req);

    return res.status(201).json({
      message: 'Plan created successfully.',
      plan: {
        id: result.lastInsertRowid,
        amount: numAmount,
        bonusPercentage: numBonus,
        status: 'AVAILABLE'
      }
    });
  } catch (err) {
    console.error('Create plan error:', err);
    return res.status(500).json({ error: 'Failed to create plan.' });
  }
}

export async function updatePlan(req, res) {
  try {
    const { id } = req.params;
    const { amount, bonusPercentage, status } = req.body;

    const existing = await db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const numAmount = amount !== undefined ? parseFloat(amount) : existing.amount;
    const numBonus = bonusPercentage !== undefined ? parseFloat(bonusPercentage) : existing.bonus_percentage;
    const newStatus = status || existing.status;

    await db.prepare(`
      UPDATE plans
      SET amount = ?, bonus_percentage = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(numAmount, numBonus, newStatus, id);

    logAudit(req.admin.id, 'UPDATE_BUY_PLAN', `Plan ID: ${id}`, existing, { amount: numAmount, bonusPercentage: numBonus, status: newStatus }, req);

    return res.json({ message: 'Plan updated successfully.', id, amount: numAmount, bonusPercentage: numBonus, status: newStatus });
  } catch (err) {
    console.error('Update plan error:', err);
    return res.status(500).json({ error: 'Failed to update plan.' });
  }
}

export async function deletePlan(req, res) {
  try {
    const { id } = req.params;

    const activeTx = await db.prepare(`
      SELECT COUNT(*) as count FROM buy_transactions
      WHERE plan_id = ? AND status IN ('PAYMENT_PENDING', 'UTR_SUBMITTED', 'UNDER_VERIFICATION')
    `).get(id).count;

    if (activeTx > 0) {
      return res.status(400).json({ error: 'Cannot delete plan while it has active transactions in progress.' });
    }

    await db.prepare('DELETE FROM plans WHERE id = ?').run(id);

    logAudit(req.admin.id, 'DELETE_BUY_PLAN', `Plan ID: ${id}`, null, null, req);

    return res.json({ message: 'Plan deleted successfully.' });
  } catch (err) {
    console.error('Delete plan error:', err);
    return res.status(500).json({ error: 'Failed to delete plan.' });
  }
}

// --- PAYMENT ACCOUNTS MANAGEMENT (ROUND-ROBIN CRUD) ---
export async function getAdminAccounts(req, res) {
  try {
    const accounts = await db.prepare(`
      SELECT
        id, account_holder as accountHolder, bank_name as bankName,
        account_number as accountNumber, ifsc, upi_id as upiId,
        status, display_limit as displayLimit, current_display_count as currentDisplayCount,
        order_index as orderIndex, created_at as createdAt
      FROM payment_accounts
      ORDER BY order_index ASC, id ASC
    `).all();

    return res.json({ accounts });
  } catch (err) {
    console.error('Get admin accounts error:', err);
    return res.status(500).json({ error: 'Failed to fetch payment accounts.' });
  }
}

export async function createAccount(req, res) {
  try {
    const { accountHolder, bankName, accountNumber, ifsc, upiId, displayLimit } = req.body;

    if (!accountHolder || !bankName || !accountNumber || !ifsc) {
      return res.status(400).json({ error: 'Account Holder, Bank Name, Account Number, and IFSC are required.' });
    }

    const limit = parseInt(displayLimit) || 5;

    const maxOrderRow = await db.prepare('SELECT MAX(order_index) as maxorder FROM payment_accounts').get();
    const maxOrder = maxOrderRow && maxOrderRow.maxorder ? parseInt(maxOrderRow.maxorder) : 0;

    const result = await db.prepare(`
      INSERT INTO payment_accounts (
        account_holder, bank_name, account_number, ifsc, upi_id, display_limit, current_display_count, order_index, status
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'ACTIVE')
    `).run(accountHolder.trim(), bankName.trim(), accountNumber.trim(), ifsc.trim(), upiId ? upiId.trim() : '', limit, maxOrder + 1);

    logAudit(req.admin.id, 'CREATE_BANK_ACCOUNT', `Account ID: ${result.lastInsertRowid}`, null, { accountHolder, bankName, limit }, req);

    return res.status(201).json({
      message: 'Bank account added successfully to Round-Robin pool.',
      account: {
        id: result.lastInsertRowid,
        accountHolder,
        bankName,
        accountNumber,
        ifsc,
        upiId,
        displayLimit: limit,
        currentDisplayCount: 0,
        status: 'ACTIVE'
      }
    });
  } catch (err) {
    console.error('Create account error:', err);
    return res.status(500).json({ error: 'Failed to create bank account.' });
  }
}

export async function updateAccount(req, res) {
  try {
    const { id } = req.params;
    const { accountHolder, bankName, accountNumber, ifsc, upiId, displayLimit, status } = req.body;

    const existing = await db.prepare('SELECT * FROM payment_accounts WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Bank account record not found.' });
    }

    await db.prepare(`
      UPDATE payment_accounts
      SET account_holder = ?, bank_name = ?, account_number = ?, ifsc = ?, upi_id = ?, display_limit = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      accountHolder || existing.account_holder,
      bankName || existing.bank_name,
      accountNumber || existing.account_number,
      ifsc || existing.ifsc,
      upiId !== undefined ? upiId : existing.upi_id,
      displayLimit !== undefined ? parseInt(displayLimit) : existing.display_limit,
      status || existing.status,
      id
    );

    logAudit(req.admin.id, 'UPDATE_BANK_ACCOUNT', `Account ID: ${id}`, existing, req.body, req);

    return res.json({ message: 'Bank account updated successfully.' });
  } catch (err) {
    console.error('Update account error:', err);
    return res.status(500).json({ error: 'Failed to update bank account.' });
  }
}

export async function resetAccountUsageCount(req, res) {
  try {
    const { id } = req.params;
    await db.prepare('UPDATE payment_accounts SET current_display_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logAudit(req.admin.id, 'RESET_ACCOUNT_COUNTER', `Account ID: ${id}`, null, { current_display_count: 0 }, req);

    return res.json({ message: 'Account usage counter reset to 0.' });
  } catch (err) {
    console.error('Reset counter error:', err);
    return res.status(500).json({ error: 'Failed to reset account usage counter.' });
  }
}

export async function deleteAccount(req, res) {
  try {
    const { id } = req.params;

    const account = await db.prepare('SELECT * FROM payment_accounts WHERE id = ?').get(id);
    if (!account) {
      return res.status(404).json({ error: 'Payment account not found.' });
    }

    // Check if there are any buy transactions associated with this account
    const txCount = await db.prepare(`
      SELECT COUNT(*) as count FROM buy_transactions WHERE payment_account_id = ?
    `).get(id).count;

    if (txCount > 0) {
      // Deactivate account so it is immediately hidden from Buy page and Round-Robin pool
      await db.prepare(`
        UPDATE payment_accounts
        SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      logAudit(req.admin.id, 'DEACTIVATE_BANK_ACCOUNT', `Account ID: ${id} (${account.bank_name})`, account, { status: 'INACTIVE' }, req);

      return res.json({
        message: `Account has ${txCount} historical or ongoing transaction(s). It has been deactivated and removed from the Buy page.`
      });
    }

    // Clean delete if no transactions reference it
    await db.prepare('DELETE FROM payment_accounts WHERE id = ?').run(id);

    logAudit(req.admin.id, 'DELETE_BANK_ACCOUNT', `Account ID: ${id}`, account, null, req);

    return res.json({ message: 'Bank account deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Failed to delete bank account.' });
  }
}

// --- BUY VERIFICATION SECTION ---
export async function getPendingBuyVerifications(req, res) {
  try {
    const pendingTxns = await db.prepare(`
      SELECT
        b.id, b.user_id as userId, b.plan_amount as planAmount,
        b.bonus_percentage as bonusPercentage, b.bonus_amount as bonusAmount,
        b.total_amount as totalAmount, b.utr, b.status, b.created_at as createdAt,
        u.username, u.mobile,
        p.account_holder as accountHolder, p.bank_name as bankName
      FROM buy_transactions b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN payment_accounts p ON b.payment_account_id = p.id
      ORDER BY b.created_at DESC
    `).all();

    const mappedTxns = pendingTxns.map(t => ({
      ...t,
      planAmount: parseFloat(t.planAmount || 0),
      bonusPercentage: parseFloat(t.bonusPercentage || 0),
      bonusAmount: parseFloat(t.bonusAmount || 0),
      totalAmount: parseFloat(t.totalAmount || 0)
    }));

    return res.json({ buyVerifications: mappedTxns });
  } catch (err) {
    console.error('Get buy verifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch purchase verifications.' });
  }
}

export async function approveBuyVerification(req, res) {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const tx = await db.prepare('SELECT * FROM buy_transactions WHERE id = ?').get(id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // IDEMPOTENCY CHECK: If already approved, return without double crediting
    if (tx.status === 'APPROVED') {
      return res.json({ message: 'Transaction was already approved.', transactionId: id, status: 'APPROVED' });
    }

    const buyer = await db.prepare('SELECT id, username, referred_by_id FROM users WHERE id = ?').get(tx.user_id);

    const approveTransaction = db.transaction(async () => {
      // 1. Update buy_transactions status
      await db.prepare(`
        UPDATE buy_transactions
        SET status = 'APPROVED', admin_note = ?, updated_at = CURRENT_TIMESTAMP, verified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(adminNote || 'Payment Verified & Approved by Admin', id);

      const planAmount = parseFloat(tx.plan_amount);
      const bonusAmount = parseFloat(tx.bonus_amount);

      // 2. Credit buyer in wallet_ledger: BUY_CREDIT and BUY_BONUS
      await db.prepare(`
        INSERT INTO wallet_ledger (user_id, amount, type, reference_type, reference_id, description)
        VALUES (?, ?, 'BUY_CREDIT', 'BUY_TRANSACTION', ?, ?)
      `).run(tx.user_id, planAmount, id, `Deposit Plan Purchase (Tx: ${id})`);

      await db.prepare(`
        INSERT INTO wallet_ledger (user_id, amount, type, reference_type, reference_id, description)
        VALUES (?, ?, 'BUY_BONUS', 'BUY_TRANSACTION', ?, ?)
      `).run(tx.user_id, bonusAmount, id, `Buy Plan Bonus (${tx.bonus_percentage}%)`);

      // 3. Referral reward processing if buyer was referred
      if (buyer && buyer.referred_by_id) {
        const refBonusSetting = await db.prepare(`SELECT value FROM system_settings WHERE key = 'referral_bonus_percent'`).get();
        const refPct = refBonusSetting ? parseFloat(refBonusSetting.value) : 0.05;

        const refRewardAmount = (planAmount * refPct) / 100;

        if (refRewardAmount > 0) {
          // Insert into referral_rewards
          await db.prepare(`
            INSERT INTO referral_rewards (referrer_id, referred_user_id, buy_transaction_id, transaction_amount, reward_percentage, reward_amount)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(buyer.referred_by_id, buyer.id, id, planAmount, refPct, refRewardAmount);

          // Credit referrer ledger
          await db.prepare(`
            INSERT INTO wallet_ledger (user_id, amount, type, reference_type, reference_id, description)
            VALUES (?, ?, 'REFERRAL_REWARD', 'REFERRAL', ?, ?)
          `).run(buyer.referred_by_id, refRewardAmount, id, `Referral Reward (${refPct}%) for purchase by ${buyer.username}`);

          // Notify referrer
          await db.prepare(`
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (?, ?, ?, 'SUCCESS')
          `).run(buyer.referred_by_id, 'Referral Reward Credited!', `You earned ₹${refRewardAmount.toFixed(2)} referral reward from ${buyer.username}'s purchase!`);
        }
      }

      // 4. Notify buyer
      await db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'SUCCESS')
      `).run(
        tx.user_id,
        'Payment Approved!',
        `Your payment of ₹${tx.plan_amount.toLocaleString()} + ₹${tx.bonus_amount.toLocaleString()} bonus (Total ₹${tx.total_amount.toLocaleString()}) has been approved and credited to your wallet.`
      );
    });

    approveTransaction();

    logAudit(req.admin.id, 'APPROVE_BUY_PAYMENT', `Tx ID: ${id}`, { status: tx.status }, { status: 'APPROVED', amount: tx.total_amount }, req);

    return res.json({ message: 'Payment successfully approved and user ledger updated.', id, status: 'APPROVED' });
  } catch (err) {
    console.error('Approve buy error:', err);
    return res.status(500).json({ error: 'Failed to approve payment verification.' });
  }
}

export async function rejectBuyVerification(req, res) {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const tx = await db.prepare('SELECT * FROM buy_transactions WHERE id = ?').get(id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    if (tx.status === 'APPROVED') {
      return res.status(400).json({ error: 'Cannot reject an already approved transaction.' });
    }

    // Rejection unlocks the plan back to AVAILABLE
    await db.prepare(`
      UPDATE buy_transactions
      SET status = 'REJECTED', admin_note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(adminNote || 'Payment Rejected by Admin', id);

    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'ERROR')
    `).run(tx.user_id, 'Payment Rejected', `Your payment verification for transaction ${id} was rejected. Note: ${adminNote || 'Invalid UTR or verification failed.'}`);

    logAudit(req.admin.id, 'REJECT_BUY_PAYMENT', `Tx ID: ${id}`, { status: tx.status }, { status: 'REJECTED', adminNote }, req);

    return res.json({ message: 'Payment rejected. Plan is now unlocked.', id, status: 'REJECTED' });
  } catch (err) {
    console.error('Reject buy error:', err);
    return res.status(500).json({ error: 'Failed to reject payment.' });
  }
}

// --- WITHDRAWAL MANAGEMENT ---
export async function getAdminWithdrawals(req, res) {
  try {
    const requests = await db.prepare(`
      SELECT
        w.id, w.user_id as userId, w.user_upi_id as userUpiId, w.upi_string as upiString,
        w.status, w.amount_paid as amountPaid, w.reference_id as referenceId,
        w.admin_note as adminNote, w.created_at as createdAt, w.processed_at as processedAt,
        u.username, u.mobile,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_ledger WHERE user_id = u.id) as userAvailableBalance
      FROM withdrawal_requests w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `).all();

    const mappedRequests = requests.map(r => ({
      ...r,
      userAvailableBalance: parseFloat(r.userAvailableBalance || 0),
      amountPaid: r.amountPaid ? parseFloat(r.amountPaid) : null
    }));

    return res.json({ withdrawalRequests: mappedRequests });
  } catch (err) {
    console.error('Get admin withdrawals error:', err);
    return res.status(500).json({ error: 'Failed to fetch withdrawal requests.' });
  }
}

export async function processWithdrawal(req, res) {
  try {
    const { id } = req.params;
    const { amountToPay, referenceId, adminNote, action } = req.body;

    const request = await db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id);
    if (!request) {
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    if (request.status === 'PAID') {
      return res.json({ message: 'Withdrawal request is already marked as PAID.', id, status: 'PAID' });
    }

    if (action === 'REJECT') {
      await db.prepare(`
        UPDATE withdrawal_requests
        SET status = 'REJECTED', admin_note = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(adminNote || 'Withdrawal rejected by Admin', id);

      await db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'ERROR')
      `).run(request.user_id, 'Withdrawal Rejected', `Your withdrawal request ${id} was rejected by Admin.`);

      logAudit(req.admin.id, 'REJECT_WITHDRAWAL', `Req ID: ${id}`, { status: request.status }, { status: 'REJECTED' }, req);

      return res.json({ message: 'Withdrawal request rejected.', id, status: 'REJECTED' });
    }

    // Action = 'MARK_PAID' or approve payout
    const payoutAmount = parseFloat(amountToPay);
    if (isNaN(payoutAmount) || payoutAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid payout amount to approve.' });
    }

    // Check user available balance
    const userBalanceRow = await db.prepare(`SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_ledger WHERE user_id = ?`).get(request.user_id);
    const userBalance = parseFloat(userBalanceRow?.balance || 0);

    if (userBalance < payoutAmount) {
      return res.status(400).json({ error: `Insufficient user balance (Available: ₹${userBalance.toLocaleString()}, Requested Payout: ₹${payoutAmount.toLocaleString()}).` });
    }

    const payWithdrawal = db.transaction(async () => {
      // Update withdrawal request
      await db.prepare(`
        UPDATE withdrawal_requests
        SET status = 'PAID', amount_paid = ?, reference_id = ?, admin_note = ?, updated_at = CURRENT_TIMESTAMP, processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(payoutAmount, referenceId ? referenceId.trim() : null, adminNote || null, id);

      // Debit user wallet ledger
      await db.prepare(`
        INSERT INTO wallet_ledger (user_id, amount, type, reference_type, reference_id, description)
        VALUES (?, ?, 'WITHDRAWAL_DEBIT', 'WITHDRAWAL', ?, ?)
      `).run(request.user_id, -payoutAmount, id, `Withdrawal Paid to ${request.upi_string} (Ref: ${referenceId || 'N/A'})`);

      // Notify user
      await db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'SUCCESS')
      `).run(request.user_id, 'Withdrawal Processed & Paid!', `Your withdrawal payout of ₹${payoutAmount.toLocaleString()} has been paid to UPI ${request.upi_string}. Reference: ${referenceId || 'N/A'}`);
    });

    payWithdrawal();

    logAudit(req.admin.id, 'PAID_WITHDRAWAL', `Req ID: ${id}`, { status: request.status }, { status: 'PAID', amountPaid: payoutAmount, referenceId }, req);

    return res.json({
      message: 'Withdrawal payout processed and marked as PAID.',
      id,
      status: 'PAID',
      amountPaid: payoutAmount
    });
  } catch (err) {
    console.error('Process withdrawal error:', err);
    return res.status(500).json({ error: 'Failed to process withdrawal.' });
  }
}

// --- BONUS & SYSTEM SETTINGS ---
export async function getSettings(req, res) {
  try {
    const settings = await db.prepare('SELECT key, value, updated_at as updatedAt FROM system_settings').all();
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    return res.json({ settings: settingsMap });
  } catch (err) {
    console.error('Get settings error:', err);
    return res.status(500).json({ error: 'Failed to fetch settings.' });
  }
}

export async function updateSettings(req, res) {
  try {
    const {
      signupBonusPercent,
      signupBonusAmount,
      buyBonusPercent,
      referralBonusPercent,
      telegramChannelLink,
      autoBuyEnabled,
      autoBuyMinAmount,
      autoBuyMaxAmount,
      autoBuyIntervalSec
    } = req.body;

    const updates = [];
    if (signupBonusPercent !== undefined) updates.push({ key: 'signup_bonus_percent', value: String(signupBonusPercent) });
    if (signupBonusAmount !== undefined) updates.push({ key: 'signup_bonus_amount', value: String(signupBonusAmount) });
    if (buyBonusPercent !== undefined) updates.push({ key: 'buy_bonus_percent', value: String(buyBonusPercent) });
    if (referralBonusPercent !== undefined) updates.push({ key: 'referral_bonus_percent', value: String(referralBonusPercent) });
    if (telegramChannelLink !== undefined) updates.push({ key: 'telegram_channel_link', value: String(telegramChannelLink) });
    if (autoBuyEnabled !== undefined) updates.push({ key: 'auto_buy_enabled', value: String(autoBuyEnabled) });
    if (autoBuyMinAmount !== undefined) updates.push({ key: 'auto_buy_min_amount', value: String(autoBuyMinAmount) });
    if (autoBuyMaxAmount !== undefined) updates.push({ key: 'auto_buy_max_amount', value: String(autoBuyMaxAmount) });
    if (autoBuyIntervalSec !== undefined) updates.push({ key: 'auto_buy_interval_sec', value: String(autoBuyIntervalSec) });

    const stmt = await db.prepare(`
      INSERT INTO system_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
    `);

    db.transaction(async () => {
      for (const u of updates) {
        stmt.run(u.key, u.value);
      }
    })();

    logAudit(req.admin.id, 'UPDATE_SYSTEM_SETTINGS', 'System Settings', null, req.body, req);

    return res.json({ message: 'Settings updated successfully.' });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Failed to update system settings.' });
  }
}

// --- AUDIT LOGS ---
export async function getAuditLogs(req, res) {
  try {
    const logs = await db.prepare(`
      SELECT
        a.id, a.action, a.target, a.previous_value as previousValue,
        a.new_value as newValue, a.ip_address as ipAddress, a.created_at as createdAt,
        adm.username as adminUsername
      FROM audit_logs a
      LEFT JOIN admin_users adm ON a.admin_id = adm.id
      ORDER BY a.id DESC
      LIMIT 100
    `).all();

    return res.json({ auditLogs: logs });
  } catch (err) {
    console.error('Get audit logs error:', err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
}

// --- SYSTEM RESET ALL ---
export async function resetAllSystemData(req, res) {
  try {
    db.pragma('foreign_keys = OFF');
    db.transaction(async () => {
      // Clear all active and historical transactions & ledger entries
      await db.prepare('DELETE FROM referral_rewards').run();
      await db.prepare('DELETE FROM buy_transactions').run();
      await db.prepare('DELETE FROM withdrawal_requests').run();
      await db.prepare('DELETE FROM wallet_ledger').run();
      await db.prepare('DELETE FROM notifications').run();
      await db.prepare('DELETE FROM audit_logs').run();

      // Reset payment accounts round-robin usage counters
      await db.prepare('UPDATE payment_accounts SET current_display_count = 0').run();

      // Clear auto-generated plans and re-seed base plans
      await db.prepare('DELETE FROM plans').run();

      // Seed standard default plans (e.g., ₹100, ₹200, ₹300, ₹500)
      const insertPlan = await db.prepare("INSERT INTO plans (amount, bonus_percentage, status) VALUES (?, ?, 'AVAILABLE')");
      insertPlan.run(100, 3.0);
      insertPlan.run(200, 3.0);
      insertPlan.run(300, 3.0);
      insertPlan.run(500, 3.0);

      // Re-apply signup bonus for existing active users if configured
      const signupBonusRow = await db.prepare("SELECT value FROM system_settings WHERE key = 'signup_bonus_amount'").get();
      const bonusAmt = signupBonusRow ? parseFloat(signupBonusRow.value) : 100;
      if (bonusAmt > 0) {
        const users = await db.prepare("SELECT id FROM users WHERE status = 'ACTIVE'").all();
        const insertLedger = await db.prepare("INSERT INTO wallet_ledger (user_id, amount, type, reference_type, description) VALUES (?, ?, 'SIGNUP_BONUS', 'REGISTRATION', ?)");
        for (const u of users) {
          insertLedger.run(u.id, bonusAmt, `Welcome Registration Bonus (₹${bonusAmt})`);
        }
      }
    })();
    db.pragma('foreign_keys = ON');

    logAudit(req.admin.id, 'RESET_ALL_SYSTEM_DATA', 'System Platform Reset', null, { resetAt: new Date().toISOString() }, req);

    return res.json({ message: 'System reset completed successfully! All transactions, ledgers, and logs have been wiped clean.' });
  } catch (err) {
    db.pragma('foreign_keys = ON');
    console.error('System reset all error:', err);
    return res.status(500).json({ error: 'Failed to execute system reset.' });
  }
}

// --- CREATE BATCH AUTO BUY ORDERS ---
export async function createBatchAutoBuyPlans(req, res) {
  try {
    const { minAmount, maxAmount, numberOfOrders, bonusPercentage } = req.body;

    const min = parseFloat(minAmount) || 100;
    const max = parseFloat(maxAmount) || 500;
    const count = parseInt(numberOfOrders) || 5;
    const bonus = bonusPercentage !== undefined ? parseFloat(bonusPercentage) : 3.0;

    if (min > max) {
      return res.status(400).json({ error: 'Minimum amount cannot be greater than maximum amount.' });
    }

    if (count <= 0 || count > 100) {
      return res.status(400).json({ error: 'Number of orders must be between 1 and 100.' });
    }

    const step = 10;
    const minStep = Math.ceil(min / step);
    const maxStep = Math.floor(max / step);

    const insertedPlans = [];

    const insertStmt = await db.prepare(`
      INSERT INTO plans (amount, bonus_percentage, status)
      VALUES (?, ?, 'AVAILABLE')
    `);

    db.transaction(async () => {
      for (let i = 0; i < count; i++) {
        const randomStep = Math.floor(Math.random() * (maxStep - minStep + 1)) + minStep;
        const randomAmount = randomStep * step;
        const result = insertStmt.run(randomAmount, bonus);
        insertedPlans.push({ id: result.lastInsertRowid, amount: randomAmount, bonusPercentage: bonus });
      }
    })();

    logAudit(req.admin.id, 'CREATE_BATCH_AUTO_BUY', `Generated ${count} Buy Plans`, null, { min, max, count, bonus }, req);

    return res.status(201).json({
      message: `Successfully created ${count} random buy plans between ₹${min} and ₹${max}!`,
      createdCount: count,
      plans: insertedPlans
    });
  } catch (err) {
    console.error('Create batch auto buy error:', err);
    return res.status(500).json({ error: 'Failed to generate batch buy plans.' });
  }
}
