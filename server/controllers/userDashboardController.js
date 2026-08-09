import db from '../db.js';

export async function getDashboardSummary(req, res) {
  try {
    const userId = req.user.id;

    // Available Balance from wallet_ledger
    const balanceRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as balance
      FROM wallet_ledger
      WHERE user_id = ?
    `).get(userId);

    // Total Buy Amount
    const buyRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM wallet_ledger
      WHERE user_id = ? AND type = 'BUY_CREDIT'
    `).get(userId);

    // Total Bonus Received (Buy bonus + Signup bonus + Admin credit bonus)
    const bonusRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM wallet_ledger
      WHERE user_id = ? AND type IN ('BUY_BONUS', 'SIGNUP_BONUS')
    `).get(userId);

    // Total Referral Reward
    const refRow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM wallet_ledger
      WHERE user_id = ? AND type = 'REFERRAL_REWARD'
    `).get(userId);

    // Total Sell / Withdrawal Paid
    const sellRow = await db.prepare(`
      SELECT COALESCE(ABS(SUM(amount)), 0) as total
      FROM wallet_ledger
      WHERE user_id = ? AND type = 'WITHDRAWAL_DEBIT'
    `).get(userId);

    // Pending Withdrawal Amount
    const pendingWithdrawRow = await db.prepare(`
      SELECT COUNT(*) as pending_count, COALESCE(SUM(amount_paid), 0) as pending_sum
      FROM withdrawal_requests
      WHERE user_id = ? AND status IN ('REQUESTED', 'PROCESSING', 'APPROVED')
    `).get(userId);

    // Recent 5 notifications
    const notifications = await db.prepare(`
      SELECT id, title, message, type, is_read as isRead, created_at as createdAt
      FROM notifications
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY id DESC
      LIMIT 5
    `).all(userId);

    return res.json({
      summary: {
        availableBalance: parseFloat(balanceRow?.balance || 0),
        totalBuyAmount: parseFloat(buyRow?.total || 0),
        totalBonusReceived: parseFloat(bonusRow?.total || 0),
        totalReferralReward: parseFloat(refRow?.total || 0),
        totalSellPaid: parseFloat(sellRow?.total || 0),
        pendingWithdrawalCount: parseInt(pendingWithdrawRow?.pending_count || 0)
      },
      notifications
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard summary.' });
  }
}

export async function getUserHistory(req, res) {
  try {
    const userId = req.user.id;

    // 1. Buy History
    const buyHistory = await db.prepare(`
      SELECT
        b.id,
        b.plan_amount as planAmount,
        b.bonus_percentage as bonusPercentage,
        b.bonus_amount as bonusAmount,
        b.total_amount as totalAmount,
        b.utr,
        b.status,
        b.created_at as createdAt,
        p.bank_name as bankName,
        p.account_holder as accountHolder
      FROM buy_transactions b
      LEFT JOIN payment_accounts p ON b.payment_account_id = p.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    // 2. Sell / Withdrawal History
    const sellHistory = await db.prepare(`
      SELECT
        w.id,
        w.upi_string as upiString,
        w.amount_paid as amountPaid,
        w.status,
        w.reference_id as referenceId,
        w.admin_note as adminNote,
        w.created_at as createdAt,
        w.processed_at as processedAt
      FROM withdrawal_requests w
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `).all(userId);

    // 3. Token / Ledger History
    const tokenHistory = await db.prepare(`
      SELECT
        id,
        amount,
        type,
        reference_id as referenceId,
        description,
        created_at as createdAt
      FROM wallet_ledger
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    // 4. Reward History (Buy Bonus entries)
    const rewardHistory = await db.prepare(`
      SELECT
        b.id as transactionId,
        b.plan_amount as planAmount,
        b.bonus_percentage as bonusPercentage,
        b.bonus_amount as bonusAmount,
        b.created_at as createdAt
      FROM buy_transactions b
      WHERE b.user_id = ? AND b.status = 'APPROVED'
      ORDER BY b.created_at DESC
    `).all(userId);

    // 5. Referral History
    const referralHistory = await db.prepare(`
      SELECT
        r.id,
        u.username as referredUsername,
        u.created_at as registrationDate,
        r.transaction_amount as transactionAmount,
        r.reward_percentage as rewardPercentage,
        r.reward_amount as rewardAmount,
        r.created_at as createdAt
      FROM referral_rewards r
      JOIN users u ON r.referred_user_id = u.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);

    return res.json({
      buyHistory,
      sellHistory,
      tokenHistory,
      rewardHistory,
      referralHistory
    });
  } catch (err) {
    console.error('User history error:', err);
    return res.status(500).json({ error: 'Failed to fetch user history.' });
  }
}

export async function getReferralInfo(req, res) {
  try {
    const user = req.user;

    const referredUsers = await db.prepare(`
      SELECT id, username, mobile, status, created_at as createdAt
      FROM users
      WHERE referred_by_id = ?
      ORDER BY id DESC
    `).all(user.id);

    const rewardsSum = await db.prepare(`
      SELECT COALESCE(SUM(reward_amount), 0) as totalReward
      FROM referral_rewards
      WHERE referrer_id = ?
    `).get(user.id);

    const refBonusSetting = await db.prepare(`SELECT value FROM system_settings WHERE key = 'referral_bonus_percent'`).get();
    const currentRefBonusPct = refBonusSetting ? parseFloat(refBonusSetting.value) : 0.05;

    return res.json({
      referralCode: user.referral_code,
      referralBonusPercentage: currentRefBonusPct,
      totalRewardsEarned: rewardsSum.totalReward,
      totalReferredCount: referredUsers.length,
      referredUsers
    });
  } catch (err) {
    console.error('Referral info error:', err);
    return res.status(500).json({ error: 'Failed to fetch referral information.' });
  }
}

export async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const notifications = await db.prepare(`
      SELECT id, title, message, type, is_read as isRead, created_at as createdAt
      FROM notifications
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY id DESC
    `).all(userId);

    return res.json({ notifications });
  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND (user_id = ? OR user_id IS NULL)
    `).run(id, userId);

    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export async function getContactInfo(req, res) {
  try {
    const telegramSetting = await db.prepare(`SELECT value FROM system_settings WHERE key = 'telegram_channel_link'`).get();
    const telegramLink = telegramSetting ? telegramSetting.value : 'https://t.me/zoopay_official';

    return res.json({
      telegramChannelLink: telegramLink
    });
  } catch (err) {
    console.error('Get contact info error:', err);
    return res.status(500).json({ error: 'Failed to fetch contact details.' });
  }
}
