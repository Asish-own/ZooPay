import db from '../db.js';

export async function getUserUPIs(req, res) {
  try {
    const userId = req.user.id;
    const upis = await db.prepare(`
      SELECT id, upi_id as upiId, status, created_at as createdAt
      FROM user_upi_accounts
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(userId);

    return res.json({ upis });
  } catch (err) {
    console.error('Get UPI error:', err);
    return res.status(500).json({ error: 'Failed to fetch UPI accounts.' });
  }
}

export async function addUPI(req, res) {
  try {
    const userId = req.user.id;
    const { upiId } = req.body;

    if (!upiId || !upiId.trim()) {
      return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g., name@bank).' });
    }

    const cleanUPI = upiId.trim();
    if (!cleanUPI.includes('@') || cleanUPI.length < 5) {
      return res.status(400).json({ error: 'Invalid UPI ID format. Must include "@" (e.g. name@upi).' });
    }

    // Check duplicate for user
    const existing = await db.prepare('SELECT id FROM user_upi_accounts WHERE user_id = ? AND upi_id = ?').get(userId, cleanUPI);
    if (existing) {
      return res.status(400).json({ error: 'This UPI ID is already added to your profile.' });
    }

    const result = await db.prepare(`
      INSERT INTO user_upi_accounts (user_id, upi_id, status)
      VALUES (?, ?, 'ACTIVE')
    `).run(userId, cleanUPI);

    return res.status(201).json({
      message: 'UPI ID added successfully.',
      upi: {
        id: result.lastInsertRowid,
        upiId: cleanUPI,
        status: 'ACTIVE'
      }
    });
  } catch (err) {
    console.error('Add UPI error:', err);
    return res.status(500).json({ error: 'Failed to add UPI ID.' });
  }
}

export async function editUPI(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { upiId } = req.body;

    if (!upiId || !upiId.trim()) {
      return res.status(400).json({ error: 'UPI ID cannot be empty.' });
    }

    const cleanUPI = upiId.trim();
    const upiRecord = await db.prepare('SELECT * FROM user_upi_accounts WHERE id = ? AND user_id = ?').get(id, userId);

    if (!upiRecord) {
      return res.status(404).json({ error: 'UPI account record not found.' });
    }

    await db.prepare(`
      UPDATE user_upi_accounts
      SET upi_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(cleanUPI, id, userId);

    return res.json({ message: 'UPI ID updated successfully.', id, upiId: cleanUPI });
  } catch (err) {
    console.error('Edit UPI error:', err);
    return res.status(500).json({ error: 'Failed to update UPI ID.' });
  }
}

export async function deleteUPI(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const upiRecord = await db.prepare('SELECT * FROM user_upi_accounts WHERE id = ? AND user_id = ?').get(id, userId);
    if (!upiRecord) {
      return res.status(404).json({ error: 'UPI record not found.' });
    }

    await db.prepare('DELETE FROM user_upi_accounts WHERE id = ? AND user_id = ?').run(id, userId);
    return res.json({ message: 'UPI ID removed successfully.' });
  } catch (err) {
    console.error('Delete UPI error:', err);
    return res.status(500).json({ error: 'Failed to delete UPI ID.' });
  }
}

export async function getBankProfile(req, res) {
  try {
    const userId = req.user.id;
    const user = await db.prepare(`
      SELECT bank_holder_name as bankHolderName, bank_account_number as bankAccountNumber, bank_ifsc as bankIfsc, bank_name as bankName, bank_upi_id as bankUpiId
      FROM users WHERE id = ?
    `).get(userId);

    const isEligibleForWithdrawal = Boolean(
      user &&
      user.bankHolderName && user.bankHolderName.trim() &&
      user.bankAccountNumber && user.bankAccountNumber.trim() &&
      user.bankIfsc && user.bankIfsc.trim() &&
      user.bankName && user.bankName.trim() &&
      user.bankUpiId && user.bankUpiId.trim()
    );

    return res.json({
      bankProfile: user || {},
      isEligibleForWithdrawal
    });
  } catch (err) {
    console.error('Get bank profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch bank profile.' });
  }
}

export async function saveBankProfile(req, res) {
  try {
    const userId = req.user.id;
    const { bankHolderName, bankAccountNumber, bankIfsc, bankName, bankUpiId } = req.body;

    if (!bankHolderName || !bankHolderName.trim()) {
      return res.status(400).json({ error: 'Account Holder Name is required.' });
    }
    if (!bankAccountNumber || !bankAccountNumber.trim()) {
      return res.status(400).json({ error: 'Bank Account Number is required.' });
    }
    if (!bankIfsc || !bankIfsc.trim()) {
      return res.status(400).json({ error: 'Bank IFSC Code is required.' });
    }
    if (!bankName || !bankName.trim()) {
      return res.status(400).json({ error: 'Bank Name is required.' });
    }
    if (!bankUpiId || !bankUpiId.trim()) {
      return res.status(400).json({ error: 'UPI ID is required.' });
    }

    const cleanHolder = bankHolderName.trim();
    const cleanAccNo = bankAccountNumber.trim();
    const cleanIfsc = bankIfsc.trim().toUpperCase();
    const cleanBankName = bankName.trim();
    const cleanUpi = bankUpiId.trim();

    await db.prepare(`
      UPDATE users
      SET bank_holder_name = ?, bank_account_number = ?, bank_ifsc = ?, bank_name = ?, bank_upi_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanHolder, cleanAccNo, cleanIfsc, cleanBankName, cleanUpi, userId);

    // Sync into user_upi_accounts table so user can select it
    const existingUpi = await db.prepare('SELECT id FROM user_upi_accounts WHERE user_id = ? AND upi_id = ?').get(userId, cleanUpi);
    if (!existingUpi) {
      await db.prepare(`
        INSERT INTO user_upi_accounts (user_id, upi_id, status)
        VALUES (?, ?, 'ACTIVE')
      `).run(userId, cleanUpi);
    }

    return res.json({
      message: 'Bank details profile updated successfully! You are now eligible for withdrawal.',
      isEligibleForWithdrawal: true
    });
  } catch (err) {
    console.error('Save bank profile error:', err);
    return res.status(500).json({ error: 'Failed to save bank profile.' });
  }
}

export async function requestWithdrawal(req, res) {
  try {
    const userId = req.user.id;
    const { userUpiId } = req.body;

    // 1. Check Bank Profile Eligibility
    const userBank = await db.prepare(`
      SELECT bank_holder_name, bank_account_number, bank_ifsc, bank_name, bank_upi_id
      FROM users WHERE id = ?
    `).get(userId);

    const isEligible = Boolean(
      userBank &&
      userBank.bank_holder_name && userBank.bank_holder_name.trim() &&
      userBank.bank_account_number && userBank.bank_account_number.trim() &&
      userBank.bank_ifsc && userBank.bank_ifsc.trim() &&
      userBank.bank_name && userBank.bank_name.trim() &&
      userBank.bank_upi_id && userBank.bank_upi_id.trim()
    );

    if (!isEligible) {
      return res.status(400).json({
        error: 'Ineligible for withdrawal. You must complete your Bank Details profile (Account Name, Account Number, IFSC, Bank Name, and UPI ID) before requesting a withdrawal.'
      });
    }

    if (!userUpiId) {
      return res.status(400).json({ error: 'Please select an active UPI ID for withdrawal.' });
    }

    const upiRecord = await db.prepare('SELECT * FROM user_upi_accounts WHERE id = ? AND user_id = ?').get(userUpiId, userId);
    if (!upiRecord) {
      return res.status(404).json({ error: 'Selected UPI ID not found.' });
    }

    if (upiRecord.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Selected UPI ID status is ${upiRecord.status}. Only ACTIVE UPI IDs can be selected for withdrawal.` });
    }

    // Check existing pending withdrawal
    const pendingReq = await db.prepare(`
      SELECT id FROM withdrawal_requests
      WHERE user_id = ? AND status IN ('REQUESTED', 'PROCESSING')
    `).get(userId);

    if (pendingReq) {
      return res.status(400).json({
        error: 'Your withdrawal request is already under processing. Please wait for Admin approval before submitting a new request.'
      });
    }

    const withdrawId = `WITH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.prepare(`
      INSERT INTO withdrawal_requests (
        id, user_id, user_upi_id, upi_string, status
      ) VALUES (?, ?, ?, ?, 'REQUESTED')
    `).run(withdrawId, userId, upiRecord.id, upiRecord.upi_id);

    await db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, ?, ?, 'INFO')
    `).run(
      userId,
      'Withdrawal Request Submitted',
      `Withdrawal request (${withdrawId}) submitted for UPI ${upiRecord.upi_id}. Withdrawal amounts are decided and processed by Admin.`
    );

    return res.status(201).json({
      message: 'Withdrawal request submitted successfully. Withdrawal payout will be processed by Admin.',
      withdrawalId: withdrawId,
      upi: upiRecord.upi_id,
      status: 'REQUESTED'
    });
  } catch (err) {
    console.error('Request withdrawal error:', err);
    return res.status(500).json({ error: 'Failed to submit withdrawal request.' });
  }
}
