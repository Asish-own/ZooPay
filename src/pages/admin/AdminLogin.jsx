import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldAlert, User, Lock, ArrowRight } from 'lucide-react';

export default function AdminLogin({ onSwitchToUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { loginAdmin } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      showToast('Please enter admin credentials.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Admin login successful!', 'success');
        loginAdmin(data.admin, data.token);
      } else {
        showToast(data.error || 'Admin authentication failed.', 'error');
      }
    } catch (err) {
      showToast('Server connection error.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2rem',
          borderColor: 'var(--warning)',
          background: 'rgba(21, 28, 44, 0.95)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              marginBottom: '1rem',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)'
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--warning)' }}>
            Admin Control Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Protected administrative authentication
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="Admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Admin Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1.25rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In As Admin'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onSwitchToUser} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Return to User Login
          </button>
        </div>
      </div>
    </div>
  );
}
