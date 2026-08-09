import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zoopay-super-secret-jwt-key-2026';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'ADMIN') {
      return res.status(403).json({ error: 'User access required.' });
    }

    const user = db.prepare('SELECT id, mobile, username, referral_code, status FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

export function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const admin = db.prepare('SELECT id, username, role FROM admin_users WHERE id = ?').get(decoded.id);
    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin session.' });
  }
}

export function verifyAnyAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'ADMIN') {
      const admin = db.prepare('SELECT id, username, role FROM admin_users WHERE id = ?').get(decoded.id);
      if (!admin) {
        return res.status(401).json({ error: 'Admin account not found.' });
      }
      req.admin = admin;
    } else {
      const user = db.prepare('SELECT id, mobile, username, referral_code as referralCode, status FROM users WHERE id = ?').get(decoded.id);
      if (!user || user.status !== 'ACTIVE') {
        return res.status(401).json({ error: 'User account not found or deactivated.' });
      }
      req.user = user;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}
