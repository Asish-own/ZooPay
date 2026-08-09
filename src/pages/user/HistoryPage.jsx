import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ShoppingBag,
  ArrowUpRight,
  History,
  Gift,
  Users,
  Coins,
  Search,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { formatIST, formatISTShort } from '../../utils/formatters';

export default function HistoryPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('buy');
  const [historyData, setHistoryData] = useState({
    buyHistory: [],
    sellHistory: [],
    tokenHistory: [],
    rewardHistory: [],
    referralHistory: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/user/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHistoryData(data);
      } else {
        showToast(data.error || 'Failed to fetch history.', 'error');
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
        Loading transaction history...
      </div>
    );
  }

  const { buyHistory, sellHistory, tokenHistory, rewardHistory, referralHistory } = historyData;

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Transaction History & Ledger</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          View detailed logs of your purchases, withdrawal payouts, wallet credits, bonuses, and referral earnings.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        <button
          className={`btn ${activeTab === 'buy' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('buy')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <ShoppingBag size={16} /> Buy History ({buyHistory.length})
        </button>
        <button
          className={`btn ${activeTab === 'sell' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('sell')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <ArrowUpRight size={16} /> Sell History ({sellHistory.length})
        </button>
        <button
          className={`btn ${activeTab === 'token' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('token')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Coins size={16} /> Token / Ledger ({tokenHistory.length})
        </button>
        <button
          className={`btn ${activeTab === 'reward' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('reward')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Gift size={16} /> Reward History ({rewardHistory.length})
        </button>
        <button
          className={`btn ${activeTab === 'referral' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('referral')}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Users size={16} /> Referral History ({referralHistory.length})
        </button>
      </div>

      {/* Tab 1: Buy History */}
      {activeTab === 'buy' && (
        <div className="glass-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Plan Amount</th>
                  <th>Bonus %</th>
                  <th>Bonus Amount</th>
                  <th>Total Return</th>
                  <th>Bank Account</th>
                  <th>UTR Reference</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {buyHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No buy transactions recorded.
                    </td>
                  </tr>
                ) : (
                  buyHistory.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{item.id}</td>
                      <td>₹{item.planAmount.toLocaleString()}</td>
                      <td>{item.bonusPercentage}%</td>
                      <td style={{ color: 'var(--success)' }}>+₹{item.bonusAmount.toLocaleString()}</td>
                      <td style={{ fontWeight: '700' }}>₹{item.totalAmount.toLocaleString()}</td>
                      <td>{item.bankName || 'Round-Robin Bank'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.utr || 'Pending'}</td>
                      <td>
                        <span className={`badge badge-${item.status.toLowerCase()}`}>{item.status}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatIST(item.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Sell / Withdrawal History */}
      {activeTab === 'sell' && (
        <div className="glass-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Withdrawal ID</th>
                  <th>UPI ID</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                  <th>Admin Reference</th>
                  <th>Admin Note</th>
                  <th>Request Date</th>
                </tr>
              </thead>
              <tbody>
                {sellHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No withdrawal records found.
                    </td>
                  </tr>
                ) : (
                  sellHistory.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{item.id}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{item.upiString}</td>
                      <td style={{ fontWeight: '700', color: item.amountPaid ? 'var(--success)' : 'var(--text-muted)' }}>
                        {item.amountPaid ? `₹${item.amountPaid.toLocaleString()}` : 'Awaiting Admin Decision'}
                      </td>
                      <td>
                        <span className={`badge badge-${item.status.toLowerCase()}`}>{item.status}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{item.referenceId || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.adminNote || '-'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatIST(item.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Token / Ledger History */}
      {activeTab === 'token' && (
        <div className="glass-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ledger ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Reference ID</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {tokenHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No ledger entries found.
                    </td>
                  </tr>
                ) : (
                  tokenHistory.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>
                        <span className="badge badge-info">{item.type}</span>
                      </td>
                      <td style={{ fontWeight: '700', color: item.amount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {item.amount >= 0 ? `+₹${item.amount.toLocaleString()}` : `-₹${Math.abs(item.amount).toLocaleString()}`}
                      </td>
                      <td>{item.description}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.referenceId || '-'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatIST(item.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Reward History */}
      {activeTab === 'reward' && (
        <div className="glass-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Plan Deposit</th>
                  <th>Bonus % Applied</th>
                  <th>Bonus Credited</th>
                  <th>Approval Date</th>
                </tr>
              </thead>
              <tbody>
                {rewardHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No rewards credited yet.
                    </td>
                  </tr>
                ) : (
                  rewardHistory.map((item) => (
                    <tr key={item.transactionId}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{item.transactionId}</td>
                      <td>₹{item.planAmount.toLocaleString()}</td>
                      <td>{item.bonusPercentage}%</td>
                      <td style={{ fontWeight: '700', color: 'var(--success)' }}>+₹{item.bonusAmount.toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatIST(item.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Referral History */}
      {activeTab === 'referral' && (
        <div className="glass-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Referred User</th>
                  <th>Registration Date</th>
                  <th>Eligible Deposit</th>
                  <th>Reward %</th>
                  <th>Reward Earned</th>
                  <th>Earned Date</th>
                </tr>
              </thead>
              <tbody>
                {referralHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No referral rewards earned yet. Share your referral link to earn rewards!
                    </td>
                  </tr>
                ) : (
                  referralHistory.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '700' }}>{item.referredUsername}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatISTShort(item.registrationDate)}
                      </td>
                      <td>₹{item.transactionAmount.toLocaleString()}</td>
                      <td>{item.rewardPercentage}%</td>
                      <td style={{ fontWeight: '700', color: 'var(--success)' }}>+₹{item.rewardAmount.toFixed(2)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatIST(item.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
