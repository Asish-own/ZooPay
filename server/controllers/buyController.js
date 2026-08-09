import db from '../db.js';

export async function getAvailablePlans(req, res) {
  try {
    const userId = req.user.id;

    // Get all system active plans
    const allPlans = await db.prepare(`
      SELECT id, amount, bonus_percentage, status, created_at
      FROM plans
      WHERE status = 'AVAILABLE'
      ORDER BY amount ASC
    `).all();

    // Get active transactions for ALL users (Single-accept rule across platform)
    const allActiveTxns = await db.prepare(`
      SELECT plan_id, user_id, id as transaction_id, status, utr, created_at
      FROM buy_transactions
      WHERE status IN ('PAYMENT_PENDING', 'UTR_SUBMITTED', 'UNDER_VERIFICATION')
    `).all();

    const lockedPlanIds = new Set(allActiveTxns.map(t => t.plan_id));

    // Active transactions for THIS current requesting user
    const userActiveTxns = allActiveTxns.filter(t => t.user_id === userId);

    // Map plans with availability state and active transaction details if locked
    const plansWithState = allPlans.map(plan => {
      const isLocked = lockedPlanIds.has(plan.id);
      const activeTx = userActiveTxns.find(t => t.plan_id === plan.id);
      const amount = parseFloat(plan.amount);
      const bonusPct = parseFloat(plan.bonus_percentage);
      const bonusAmt = (amount * bonusPct) / 100;
      const totalAmt = amount + bonusAmt;

      return {
        id: plan.id,
        amount: amount,
        bonusPercentage: bonusPct,
        bonusAmount: bonusAmt,
        totalAmount: totalAmt,
        isAvailableForUser: !isLocked,
        activeTransaction: activeTx ? {
          id: activeTx.transaction_id,
          status: activeTx.status,
          utr: activeTx.utr,
          createdAt: activeTx.created_at
        } : null
      };
    });

    return res.json({
      plans: plansWithState,
      activeTransactions: userActiveTxns
    });
  } catch (err) {
    console.error('Error fetching plans:', err);
    return res.status(500).json({ error: 'Failed to fetch buy plans.' });
  }
}

export async function initiateBuy(req, res) {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'Please select a plan to purchase.' });
    }

    const plan = await db.prepare('SELECT * FROM plans WHERE id = ? AND status = \'AVAILABLE\'').get(planId);
    if (!plan) {
      return res.status(404).json({ error: 'This plan is no longer available.' });
    }

    // Check if ANY user has already accepted or has an active transaction for this plan
    const anyActiveTx = await db.prepare(`
      SELECT id, user_id, status FROM buy_transactions
      WHERE plan_id = ? AND status IN ('PAYMENT_PENDING', 'UTR_SUBMITTED', 'UNDER_VERIFICATION')
    `).get(planId);

    if (anyActiveTx) {
      if (anyActiveTx.user_id === userId) {
        return res.status(400).json({
          error: 'You already have an active purchase in progress for this plan.',
          transactionId: anyActiveTx.id
        });
      } else {
        return res.status(400).json({
          error: 'This plan has already been accepted by another user and is no longer available.'
        });
      }
    }

    // Check global buy bonus setting if set, else fallback to plan bonus
    const buyBonusSetting = await db.prepare(`SELECT value FROM system_settings WHERE key = 'buy_bonus_percent'`).get();
    const planAmount = parseFloat(plan.amount);
    const bonusPct = buyBonusSetting && buyBonusSetting.value ? parseFloat(buyBonusSetting.value) : parseFloat(plan.bonus_percentage);

    const bonusAmount = (planAmount * bonusPct) / 100;
    const totalAmount = planAmount + bonusAmount;

    // --- ROUND-ROBIN PAYMENT ACCOUNT SELECTION ---
    const selectAccountTx = db.transaction(async () => {
      const activeAccounts = await db.prepare(`
        SELECT * FROM payment_accounts
        WHERE status = 'ACTIVE'
        ORDER BY order_index ASC, id ASC
      `).all();

      if (activeAccounts.length === 0) {
        return null; // No active account available
      }

      // 1. Try to find account with current_display_count < display_limit
      let selectedAccount = activeAccounts.find(acc => acc.current_display_count < acc.display_limit);

      // 2. If all active accounts reached their display limits, reset all active counters to 0 and pick first
      if (!selectedAccount) {
        await db.prepare(`
          UPDATE payment_accounts
          SET current_display_count = 0, updated_at = CURRENT_TIMESTAMP
          WHERE status = 'ACTIVE'
        `).run();

        selectedAccount = activeAccounts[0];
        selectedAccount.current_display_count = 0;
      }

      // 3. Increment usage count for selected account
      await db.prepare(`
        UPDATE payment_accounts
        SET current_display_count = current_display_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(selectedAccount.id);

      return selectedAccount;
    });

    const paymentAccount = await selectAccountTx();

    if (!paymentAccount) {
      return res.status(400).json({ error: 'No payment account is currently available. Please try again later.' });
    }

    // Generate unique buy transaction ID
    const transactionId = `BUY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create purchase record
    await db.prepare(`
      INSERT INTO buy_transactions (
        id, user_id, plan_id, plan_amount, bonus_percentage, bonus_amount, total_amount, payment_account_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAYMENT_PENDING')
    `).run(
      transactionId,
      userId,
      plan.id,
      plan.amount,
      bonusPct,
      bonusAmount,
      totalAmount,
      paymentAccount.id
    );

    // Notify user
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'INFO')
    `).run(
      userId,
      'Buy Order Initiated',
      `You initiated a buy order for ₹${plan.amount.toLocaleString()} with ${bonusPct}% bonus (Total ₹${totalAmount.toLocaleString()}). Please complete payment and submit UTR.`
    );

    return res.status(201).json({
      message: 'Buy order initiated successfully.',
      transaction: {
        id: transactionId,
        planId: plan.id,
        planAmount: plan.amount,
        bonusPercentage: bonusPct,
        bonusAmount: bonusAmount,
        totalAmount: totalAmount,
        status: 'PAYMENT_PENDING'
      },
      paymentAccount: {
        accountHolder: paymentAccount.account_holder,
        bankName: paymentAccount.bank_name,
        accountNumber: paymentAccount.account_number,
        ifsc: paymentAccount.ifsc,
        upiId: paymentAccount.upi_id
      }
    });
  } catch (err) {
    console.error('Initiate buy error:', err);
    return res.status(500).json({ error: 'Failed to initiate buy order.' });
  }
}

export async function submitUTR(req, res) {
  try {
    const userId = req.user.id;
    const { transactionId, utr } = req.body;

    if (!transactionId || !utr) {
      return res.status(400).json({ error: 'Transaction ID and UTR / Transaction ID are required.' });
    }

    const cleanUTR = utr.trim();
    if (cleanUTR.length < 6) {
      return res.status(400).json({ error: 'Please enter a valid UTR / Transaction reference (minimum 6 digits).' });
    }

    const tx = await db.prepare('SELECT * FROM buy_transactions WHERE id = ? AND user_id = ?').get(transactionId, userId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    if (tx.status === 'APPROVED') {
      return res.status(400).json({ error: 'This payment has already been verified and approved.' });
    }

    if (tx.status === 'CANCELLED') {
      return res.status(400).json({ error: 'This transaction was cancelled.' });
    }

    // Check duplicate UTR across system
    const duplicateUTR = await db.prepare(`
      SELECT id FROM buy_transactions
      WHERE utr = ? AND id != ? AND status != 'CANCELLED'
    `).get(cleanUTR, transactionId);

    if (duplicateUTR) {
      return res.status(400).json({ error: 'UTR already submitted for another transaction.' });
    }

    // Update status to UTR_SUBMITTED / UNDER_VERIFICATION
    await db.prepare(`
      UPDATE buy_transactions
      SET utr = ?, status = 'UTR_SUBMITTED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanUTR, transactionId);

    // Notify user
    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'INFO')
    `).run(
      userId,
      'Payment Under Verification',
      `Your UTR (${cleanUTR}) for transaction ${transactionId} has been submitted. Payment is currently under verification by Admin.`
    );

    return res.json({
      message: 'Your payment is under verification.',
      transactionId,
      status: 'UTR_SUBMITTED',
      utr: cleanUTR
    });
  } catch (err) {
    console.error('Submit UTR error:', err);
    return res.status(500).json({ error: 'Failed to submit UTR.' });
  }
}

export async function cancelBuy(req, res) {
  try {
    const userId = req.user.id;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required.' });
    }

    const tx = await db.prepare('SELECT * FROM buy_transactions WHERE id = ? AND user_id = ?').get(transactionId, userId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    if (tx.status === 'APPROVED') {
      return res.status(400).json({ error: 'Cannot cancel an already approved transaction.' });
    }

    // Cancel transaction, which unlocks the plan to AVAILABLE status for the user
    await db.prepare(`
      UPDATE buy_transactions
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(transactionId);

    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'WARNING')
    `).run(userId, 'Buy Order Cancelled', `Transaction ${transactionId} has been cancelled. The plan is now available for purchase again.`);

    return res.json({
      message: 'Transaction cancelled successfully. The plan is now available again.',
      transactionId,
      status: 'CANCELLED'
    });
  } catch (err) {
    console.error('Cancel buy error:', err);
    return res.status(500).json({ error: 'Failed to cancel transaction.' });
  }
}
