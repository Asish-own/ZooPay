import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken } from '../middleware/auth.js';

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ZP';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function register(req, res) {
  try {
    const { mobile, username, password, confirmPassword, referralCode } = req.body;

    if (!mobile || !username || !password) {
      return res.status(400).json({ error: 'Mobile number, username, and password are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Clean inputs
    const cleanMobile = mobile.trim();
    const cleanUsername = username.trim();

    if (cleanMobile.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    // Check unique mobile
    const existingMobile = db.prepare('SELECT id FROM users WHERE mobile = ?').get(cleanMobile);
    if (existingMobile) {
      return res.status(400).json({ error: 'Mobile number already registered.' });
    }

    // Check unique username
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    // Check referral code if provided
    let referrerId = null;
    if (referralCode && referralCode.trim() !== '') {
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode.trim().toUpperCase());
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code.' });
      }
      referrerId = referrer.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate unique referral code for this new user
    let userReferralCode = generateReferralCode();
    while (db.prepare('SELECT id FROM users WHERE referral_code = ?').get(userReferralCode)) {
      userReferralCode = generateReferralCode();
    }

    // Execute in transaction
    const insertUser = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO users (mobile, username, password_hash, referral_code, referred_by_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanMobile, cleanUsername, passwordHash, userReferralCode, referrerId);

      const userId = result.lastInsertRowid;

      // Check signup bonus amount setting (e.g. ₹100)
      const signupBonusAmountRow = db.prepare(`SELECT value FROM system_settings WHERE key = 'signup_bonus_amount'`).get();
      let bonusAmount = signupBonusAmountRow ? parseFloat(signupBonusAmountRow.value) : 0;

      if (isNaN(bonusAmount) || bonusAmount <= 0) {
        // Fallback to percentage calculation if amount not set
        const signupBonusPctRow = db.prepare(`SELECT value FROM system_settings WHERE key = 'signup_bonus_percent'`).get();
        const bonusPct = signupBonusPctRow ? parseFloat(signupBonusPctRow.value) : 0;
        if (bonusPct > 0) {
          bonusAmount = (100 * bonusPct) / 100;
        }
      }

      if (bonusAmount > 0) {
        db.prepare(`
          INSERT INTO wallet_ledger (user_id, amount, type, reference_type, description)
          VALUES (?, ?, 'SIGNUP_BONUS', 'REGISTRATION', ?)
        `).run(userId, bonusAmount, `Welcome Registration Bonus (₹${bonusAmount.toLocaleString()})`);
      }

      // Add welcome notification
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(userId, 'Welcome to ZooPay!', 'Your account has been created successfully. Explore available buy plans to start earning bonuses.', 'SUCCESS');

      return userId;
    });

    const newUserId = insertUser();

    return res.status(201).json({
      message: 'Registration successful! Please log in.',
      userId: newUserId
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed due to a server error. Please try again.' });
  }
}

export async function login(req, res) {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ error: 'Please enter your mobile number and password.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password message. Please check your password.' });
    }

    const token = generateToken({ id: user.id, username: user.username, role: 'USER' });

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        mobile: user.mobile,
        username: user.username,
        referralCode: user.referral_code,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
}

export async function adminLogin(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter admin username and password.' });
    }

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.trim());
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = generateToken({ id: admin.id, username: admin.username, role: 'ADMIN' });

    return res.json({
      message: 'Admin login successful!',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Admin login failed.' });
  }
}

export function getMe(req, res) {
  if (req.user) {
    return res.json({ role: 'USER', user: req.user });
  }
  if (req.admin) {
    return res.json({ role: 'ADMIN', admin: req.admin });
  }
  return res.status(401).json({ error: 'Not authenticated.' });
}
