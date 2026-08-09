import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Settings, Save, Percent, Send, RefreshCw, Zap } from 'lucide-react';

export default function SettingsManagement() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [signupBonus, setSignupBonus] = useState('3');
  const [signupBonusAmount, setSignupBonusAmount] = useState('100');
  const [buyBonus, setBuyBonus] = useState('3');
  const [referralBonus, setReferralBonus] = useState('0.05');
  const [telegramLink, setTelegramLink] = useState('https://t.me/zoopay_official');
  
  // Auto-Buy Plan Generator state
  const [autoBuyEnabled, setAutoBuyEnabled] = useState(true);
  const [autoBuyMinAmount, setAutoBuyMinAmount] = useState('100');
  const [autoBuyMaxAmount, setAutoBuyMaxAmount] = useState('500');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.settings) {
        setSignupBonus(data.settings.signup_bonus_percent || '3');
        setSignupBonusAmount(data.settings.signup_bonus_amount || '100');
        setBuyBonus(data.settings.buy_bonus_percent || '3');
        setReferralBonus(data.settings.referral_bonus_percent || '0.05');
        setTelegramLink(data.settings.telegram_channel_link || 'https://t.me/zoopay_official');
        setAutoBuyEnabled(data.settings.auto_buy_enabled !== 'false');
        setAutoBuyMinAmount(data.settings.auto_buy_min_amount || '100');
        setAutoBuyMaxAmount(data.settings.auto_buy_max_amount || '500');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          signupBonusPercent: parseFloat(signupBonus),
          signupBonusAmount: parseFloat(signupBonusAmount),
          buyBonusPercent: parseFloat(buyBonus),
          referralBonusPercent: parseFloat(referralBonus),
          telegramChannelLink: telegramLink.trim(),
          autoBuyEnabled: String(autoBuyEnabled),
          autoBuyMinAmount: parseFloat(autoBuyMinAmount),
          autoBuyMaxAmount: parseFloat(autoBuyMaxAmount)
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        fetchSettings();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading platform settings...
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Bonus & System Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Configure global percentages for First-Time Signup Bonus, Buy Bonus, Referral Reward %, Auto Buy Generator Range, and Support Telegram Link.
        </p>
      </div>

      <div className="glass-card" style={{ maxWidth: '680px' }}>
        <form onSubmit={handleSaveSettings}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Percent size={20} color="var(--warning)" /> Bonus Percentages Configuration
          </h2>

          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--success)', fontWeight: '700' }}>
              First-Time Registration Welcome Bonus Amount (₹)
            </label>
            <input
              type="number"
              step="1"
              className="form-control"
              placeholder="e.g. 100"
              value={signupBonusAmount}
              onChange={(e) => setSignupBonusAmount(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              New users will automatically receive this exact rupee bonus (e.g. ₹100) credited to their wallet upon account creation.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">First-Time Registration Bonus Percentage (%) (Fallback)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 3"
              value={signupBonus}
              onChange={(e) => setSignupBonus(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Global Default Buy Bonus Percentage (%)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 3"
              value={buyBonus}
              onChange={(e) => setBuyBonus(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Referral Reward Percentage (%)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 0.05"
              value={referralBonus}
              onChange={(e) => setReferralBonus(e.target.value)}
              required
            />
          </div>

          {/* Auto Buy Plan Generator Settings */}
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '1.75rem 0 1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <Zap size={20} color="var(--primary)" /> Auto Buy Plan Generator (Every 30 Seconds)
          </h2>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99, 102, 241, 0.08)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Enable 30-Second Auto Plan Creation</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automatically generates random buy plans for users every 30 seconds</div>
            </div>
            <input
              type="checkbox"
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              checked={autoBuyEnabled}
              onChange={(e) => setAutoBuyEnabled(e.target.checked)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Minimum Random Plan Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 100"
                value={autoBuyMinAmount}
                onChange={(e) => setAutoBuyMinAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Maximum Random Plan Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 500"
                value={autoBuyMaxAmount}
                onChange={(e) => setAutoBuyMaxAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'block', marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Admin editable range: The engine will generate random plans between ₹{autoBuyMinAmount || 100} and ₹{autoBuyMaxAmount || 500} every 30 seconds.
          </span>

          <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '1.75rem 0 1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Send size={20} color="#0088cc" /> Contact & Telegram Settings
          </h2>

          <div className="form-group">
            <label className="form-label">Support Telegram Channel Link</label>
            <input
              type="url"
              className="form-control"
              placeholder="e.g. https://t.me/zoopay_official"
              value={telegramLink}
              onChange={(e) => setTelegramLink(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving Settings...' : 'Save Configuration Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
