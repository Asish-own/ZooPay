import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/StatCard';
import {
  Wallet,
  ShoppingBag,
  ArrowUpRight,
  Gift,
  Users,
  Clock,
  Bell,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { formatIST } from '../../utils/formatters';

export default function UserDashboard({ setActiveTab }) {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/user/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        showToast(result.error || 'Failed to load dashboard.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading dashboard summary...
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="content-wrapper">
      {/* Welcome Banner */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(30, 41, 59, 0.6) 100%)',
          borderColor: 'rgba(99, 102, 241, 0.4)',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--primary-light)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
              <Sparkles size={14} /> Official ZooPay Platform
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Hello, {user?.username}!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Referral Code: <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{user?.referralCode}</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => setActiveTab('buy')}>
              <ShoppingBag size={18} /> Buy Plans
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveTab('sell')}>
              <ArrowUpRight size={18} /> Withdraw Payout
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '1rem' }}>Wallet & Balance Summary</h2>
      <div className="grid-cards">
        <StatCard
          title="Available Balance"
          value={`₹${(summary.availableBalance || 0).toLocaleString()}`}
          subtext="Ready for admin withdrawal"
          icon={Wallet}
          color="var(--success)"
        />
        <StatCard
          title="Total Buy Amount"
          value={`₹${(summary.totalBuyAmount || 0).toLocaleString()}`}
          subtext="Total principal deposited"
          icon={ShoppingBag}
          color="var(--primary)"
        />
        <StatCard
          title="Total Bonus Received"
          value={`₹${(summary.totalBonusReceived || 0).toLocaleString()}`}
          subtext="Purchases & Signup bonuses"
          icon={Gift}
          color="var(--warning)"
        />
        <StatCard
          title="Total Referral Reward"
          value={`₹${(summary.totalReferralReward || 0).toLocaleString()}`}
          subtext="Earned from referred users"
          icon={Users}
          color="#ec4899"
        />
        <StatCard
          title="Total Sell / Withdrawal Paid"
          value={`₹${(summary.totalSellPaid || 0).toLocaleString()}`}
          subtext="Successfully paid out by Admin"
          icon={ArrowUpRight}
          color="#3b82f6"
        />
        <StatCard
          title="Pending Withdrawal Requests"
          value={summary.pendingWithdrawalCount || 0}
          subtext="Awaiting Admin payout processing"
          icon={Clock}
          color="var(--warning)"
          badge={summary.pendingWithdrawalCount > 0 ? { type: 'warning', text: 'Processing' } : null}
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid-cards" style={{ marginTop: '1.5rem' }}>
        <div
          className="glass-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('buy')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
              <ShoppingBag size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>Explore Buy Plans</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose from ₹500, ₹1000, ₹2000, ₹5000+ plans with auto bonus calculation</div>
            </div>
            <ArrowRight size={20} color="var(--text-subtle)" />
          </div>
        </div>

        <div
          className="glass-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('sell')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
              <ArrowUpRight size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>Sell / Withdraw Funds</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage active UPI IDs & submit withdrawal requests for Admin review</div>
            </div>
            <ArrowRight size={20} color="var(--text-subtle)" />
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      <div className="glass-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <Bell size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Recent Account Notifications</h3>
        </div>

        {data?.notifications?.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            No new notifications.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data?.notifications?.map((n) => (
              <div
                key={n.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{n.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    {formatIST(n.createdAt)}
                  </div>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {n.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
