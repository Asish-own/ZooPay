import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Users, Copy, Gift, Share2, CheckCircle2, Award } from 'lucide-react';

export default function ReferralsPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [refData, setRefData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const res = await fetch('/api/user/referrals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRefData(data);
      } else {
        showToast(data.error || 'Failed to fetch referral data.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode || ''}`;

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'info');
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading referral program details...
      </div>
    );
  }

  const { referralCode, referralBonusPercentage, totalRewardsEarned, totalReferredCount, referredUsers } = refData || {};

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Referral Program</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Invite friends to ZooPay and earn a <strong>{referralBonusPercentage}% referral reward</strong> on every eligible purchase they make.
        </p>
      </div>

      {/* Referral Link & Code Banner */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
          borderColor: 'var(--primary)',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
              Your Unique Referral Code
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                {referralCode}
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => copyText(referralCode, 'Referral Code')}
              >
                <Copy size={16} /> Copy Code
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
              Your Unique Referral Link
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              <input
                type="text"
                className="form-control"
                readOnly
                value={referralLink}
                style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
              />
              <button
                className="btn btn-primary"
                style={{ padding: '0.6rem 0.85rem' }}
                onClick={() => copyText(referralLink, 'Referral Link')}
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Metrics Cards */}
      <div className="grid-cards" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Referred Users</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--primary)' }}>
            {totalReferredCount || 0}
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Referral Reward Rate</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--warning)' }}>
            {referralBonusPercentage}%
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Referral Rewards Earned</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--success)' }}>
            ₹{(totalRewardsEarned || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Referred Users Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Users size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Referred Users List</h2>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Username</th>
                <th>Registration Date</th>
                <th>Account Status</th>
              </tr>
            </thead>
            <tbody>
              {referredUsers?.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No referred users yet. Share your code or referral link to invite friends!
                  </td>
                </tr>
              ) : (
                referredUsers?.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td style={{ fontWeight: '700' }}>{u.username}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge badge-${u.status.toLowerCase()}`}>{u.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
