import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LogIn, Lock, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

export default function UserLogin({ onSwitchToRegister, onSwitchToAdmin }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { loginUser } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mobile || !password) {
      showToast('Please enter your mobile number and password.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Login successful!', 'success');
        loginUser(data.user, data.token);
      } else {
        showToast(data.error || 'Login failed.', 'error');
      }
    } catch (err) {
      showToast('Server connection error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '800',
              fontSize: '1.5rem',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              marginBottom: '1rem'
            }}
          >
            ZP
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Welcome to ZooPay</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Enter your mobile number and password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
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

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }} disabled={submitting}>
            {submitting ? 'Logging in...' : 'Sign In'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} style={{ color: 'var(--primary)', fontWeight: '600' }}>
            Register Now
          </button>
        </div>
      </div>
    </div>
  );
}
