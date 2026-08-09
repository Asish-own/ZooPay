import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import {
  Users,
  ShoppingBag,
  ArrowUpRight,
  Wallet,
  CheckSquare,
  Clock,
  Shield,
  Layers,
  CreditCard,
  RotateCcw,
  Zap,
  AlertTriangle
} from 'lucide-react';

export default function AdminDashboard({ setActiveTab }) {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto Buy Batch Modal State
  const [autoBuyModalOpen, setAutoBuyModalOpen] = useState(false);
  const [minAmount, setMinAmount] = useState('100');
  const [maxAmount, setMaxAmount] = useState('500');
  const [numberOfOrders, setNumberOfOrders] = useState('10');
  const [bonusPercentage, setBonusPercentage] = useState('3');
  const [generatingAutoBuy, setGeneratingAutoBuy] = useState(false);

  // Reset All Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [resettingAll, setResettingAll] = useState(false);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
      } else {
        showToast(data.error || 'Failed to fetch admin dashboard stats.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAutoBuyBatch = async (e) => {
    e.preventDefault();

    setGeneratingAutoBuy(true);
    try {
      const res = await fetch('/api/admin/auto-buy/create-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          minAmount: parseFloat(minAmount),
          maxAmount: parseFloat(maxAmount),
          numberOfOrders: parseInt(numberOfOrders),
          bonusPercentage: parseFloat(bonusPercentage)
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setAutoBuyModalOpen(false);
        fetchAdminStats();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error generating batch buy orders.', 'error');
    } finally {
      setGeneratingAutoBuy(false);
    }
  };

  const handleResetAllSystemData = async (e) => {
    e.preventDefault();

    if (confirmInput.trim().toUpperCase() !== 'RESET') {
      showToast('Please type "RESET" in capital letters to confirm platform reset.', 'warning');
      return;
    }

    setResettingAll(true);
    try {
      const res = await fetch('/api/admin/reset-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setResetModalOpen(false);
        setConfirmInput('');
        fetchAdminStats();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error executing platform reset.', 'error');
    } finally {
      setResettingAll(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading admin dashboard metrics...
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="content-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--warning)' }}>
            Admin Overview & Accounting
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Platform deposit metrics, pending UTR verifications, and withdrawal management
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setAutoBuyModalOpen(true)}>
            <Zap size={18} /> Create Auto Buy Batch
          </button>

          <button
            className="btn btn-danger"
            onClick={() => {
              setConfirmInput('');
              setResetModalOpen(true);
            }}
          >
            <RotateCcw size={18} /> Reset All
          </button>
        </div>
      </div>

      {/* Admin Stat Cards */}
      <div className="grid-cards">
        <StatCard
          title="Total Registered Users"
          value={s.totalUsers || 0}
          subtext="Total user accounts"
          icon={Users}
          color="var(--primary)"
        />
        <StatCard
          title="Total Deposited Amount"
          value={`₹${(s.totalDeposited || 0).toLocaleString()}`}
          subtext="Total approved buy orders"
          icon={ShoppingBag}
          color="var(--success)"
        />
        <StatCard
          title="Total Withdrawals Paid"
          value={`₹${(s.totalWithdrawalsPaid || 0).toLocaleString()}`}
          subtext="Processed & paid to users"
          icon={ArrowUpRight}
          color="#3b82f6"
        />
        <StatCard
          title="Amount Available / Left"
          value={`₹${(s.amountAvailableLeft || 0).toLocaleString()}`}
          subtext="Net liquidity reserve"
          icon={Wallet}
          color="var(--warning)"
        />
        <StatCard
          title="Pending Buy Verification"
          value={s.pendingBuyVerification || 0}
          subtext="UTRs awaiting review"
          icon={CheckSquare}
          color="var(--warning)"
          badge={s.pendingBuyVerification > 0 ? { type: 'warning', text: 'Action Needed' } : null}
        />
        <StatCard
          title="Pending Withdrawals"
          value={s.pendingWithdrawalRequests || 0}
          subtext="Requests awaiting payout decision"
          icon={Clock}
          color="var(--danger)"
          badge={s.pendingWithdrawalRequests > 0 ? { type: 'danger', text: 'Action Needed' } : null}
        />
      </div>

      {/* Quick Action Navigation Grid for Admin */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '1.5rem 0 1rem' }}>
        Quick Management Actions
      </h2>
      <div className="grid-cards">
        <div
          className="glass-card"
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--warning)' }}
          onClick={() => setActiveTab('admin-buy-verification')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
              <CheckSquare size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>Buy / UTR Verification</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {s.pendingBuyVerification || 0} pending payments waiting for UTR check & balance approval
              </div>
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--danger)' }}
          onClick={() => setActiveTab('admin-withdrawals')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--danger)' }}>
              <ArrowUpRight size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>Withdrawal Payouts</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {s.pendingWithdrawalRequests || 0} withdrawal requests waiting for payout amount decision
              </div>
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--primary)' }}
          onClick={() => setActiveTab('admin-accounts')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
              <CreditCard size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>Round-Robin Accounts</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Configure bank accounts, display limits & active routing counts
              </div>
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{ cursor: 'pointer', borderLeft: '4px solid var(--success)' }}
          onClick={() => setActiveTab('admin-plans')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem' }}>Buy Plan Management</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Create plans with any custom amount (₹500, ₹1k, ₹5k, ₹10k, etc.) & bonus %
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Create Auto Buy Batch */}
      <Modal
        isOpen={autoBuyModalOpen}
        onClose={() => setAutoBuyModalOpen(false)}
        title="Create Auto Buy Batch Orders"
      >
        <form onSubmit={handleCreateAutoBuyBatch}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Instantly generate random buy plan orders within your configured price range.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Min Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Amount (₹)</label>
              <input
                type="number"
                className="form-control"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">No. of Orders to Create</label>
              <input
                type="number"
                min="1"
                max="100"
                className="form-control"
                placeholder="e.g. 10"
                value={numberOfOrders}
                onChange={(e) => setNumberOfOrders(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bonus Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={bonusPercentage}
                onChange={(e) => setBonusPercentage(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={generatingAutoBuy}>
              <Zap size={16} /> {generatingAutoBuy ? 'Generating...' : `Generate ${numberOfOrders} Random Orders`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setAutoBuyModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reset All Platform Data */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="⚠️ Reset All Platform Data & Transactions"
      >
        <form onSubmit={handleResetAllSystemData}>
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.25rem',
              fontSize: '0.875rem'
            }}
          >
            <div style={{ color: 'var(--danger)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} /> Danger Zone: Irreversible System Reset
            </div>
            <div>
              This action will clear all buy orders, pending UTR verifications, withdrawal requests, wallet ledgers, audit logs, and notifications. User bank profile accounts will remain intact, and payment account counters will reset to 0.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '700' }}>
              Type "RESET" to confirm:
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="RESET"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="submit"
              className="btn btn-danger"
              style={{ flex: 1 }}
              disabled={resettingAll || confirmInput.trim().toUpperCase() !== 'RESET'}
            >
              <RotateCcw size={16} /> {resettingAll ? 'Resetting All...' : 'Confirm Reset All'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setResetModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
