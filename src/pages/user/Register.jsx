import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { UserPlus, Phone, User, Lock, Gift, ArrowRight } from 'lucide-react';

export default function UserRegister({ onSwitchToLogin, initialRefCode = '' }) {
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialRefCode);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    // Check URL params for ?ref=CODE
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!mobile || !username || !password || !confirmPassword) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          username,
          password,
          confirmPassword,
          referralCode
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Registration successful!', 'success');
        onSwitchToLogin();
      } else {
        showToast(data.error || 'Registration failed.', 'error');
      }
    } catch (err) {
      showToast('Server connection error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              marginBottom: '1rem',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
            }}
          >
            <UserPlus size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Create Your Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Register to access instant buy plans and withdrawal payouts
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Mobile Number (Unique)</label>
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
            <label className="form-label">Username (Unique)</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="e.g. asish123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Referral Code (Optional)</label>
            <div style={{ position: 'relative' }}>
              <Gift size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.75rem', textTransform: 'uppercase' }}
                placeholder="e.g. ABC123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-success btn-full" style={{ marginTop: '1.25rem' }} disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Register Account'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already registered?{' '}
          <button onClick={onSwitchToLogin} style={{ color: 'var(--primary)', fontWeight: '600' }}>
            Log In Here
          </button>
        </div>
      </div>
    </div>
  );
}
