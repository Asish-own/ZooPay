import db from '../db.js';

export function logAudit(adminId, action, target = null, prevValue = null, newValue = null, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, target, previous_value, new_value, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      action,
      target ? String(target) : null,
      prevValue ? JSON.stringify(prevValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      String(ip)
    );
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
