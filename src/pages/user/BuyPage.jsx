import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import {
  ShoppingBag,
  Gift,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Copy,
  Clock,
  ArrowRight,
  XCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function BuyPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [plans, setPlans] = useState([]);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [initiatedTx, setInitiatedTx] = useState(null);
  const [paymentAccount, setPaymentAccount] = useState(null);
  const [initiating, setInitiating] = useState(false);

  // UTR State
  const [utrInput, setUtrInput] = useState('');
  const [submittingUTR, setSubmittingUTR] = useState(false);

  useEffect(() => {
    fetchPlans();
    // Auto-refresh plans every 5 seconds to show new auto-generated plans in real time
    const interval = setInterval(() => {
      fetchPlans();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/user/plans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPlans(data.plans || []);
        setActiveTransactions(data.activeTransactions || []);
      } else {
        showToast(data.error || 'Failed to fetch buy plans.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateBuy = async (plan) => {
    setSelectedPlan(plan);
    setInitiating(true);

    try {
      const res = await fetch('/api/user/buy/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ planId: plan.id })
      });

      const data = await res.json();

      if (res.ok) {
        setInitiatedTx(data.transaction);
        setPaymentAccount(data.paymentAccount);
        setUtrInput('');
        setModalOpen(true);
        // Refresh plans to enforce plan locking in UI immediately
        fetchPlans();
      } else {
        showToast(data.error || 'Failed to initiate purchase.', 'error');
      }
    } catch (err) {
      showToast('Error initiating buy order.', 'error');
    } finally {
      setInitiating(false);
    }
  };

  const handleSubmitUTR = async (txId) => {
    if (!utrInput || utrInput.trim().length < 6) {
      showToast('Please enter a valid UTR reference (minimum 6 digits).', 'warning');
      return;
    }

    setSubmittingUTR(true);
    try {
      const res = await fetch('/api/user/buy/submit-utr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionId: txId,
          utr: utrInput.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Your payment is under verification.', 'success');
        setModalOpen(false);
        fetchPlans();
      } else {
        showToast(data.error || 'Failed to submit UTR.', 'error');
      }
    } catch (err) {
      showToast('Server error while submitting UTR.', 'error');
    } finally {
      setSubmittingUTR(false);
    }
  };

  const handleCancelTransaction = async (txId) => {
    try {
      const res = await fetch('/api/user/buy/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId: txId })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Transaction cancelled.', 'info');
        setModalOpen(false);
        fetchPlans();
      } else {
        showToast(data.error || 'Failed to cancel transaction.', 'error');
      }
    } catch (err) {
      showToast('Server error during cancellation.', 'error');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'info');
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading buy plans and round-robin accounts...
      </div>
    );
  }

  // Filter plans available for user (Plan Locking logic: locked active plans do not appear)
  const availablePlans = plans.filter(p => p.isAvailableForUser);

  return (
    <div className="content-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Purchase Buy Plans</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Select an available plan. Payment details will be routed via the platform's automatic Round-Robin system.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-light)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
          <Zap size={14} color="var(--warning)" /> Live 30s Auto Generator Active
        </div>
      </div>

      {/* Active Transactions Banner if any active plan is locked */}
      {activeTransactions.length > 0 && (
        <div
          className="glass-card"
          style={{
            borderColor: 'var(--warning)',
            background: 'rgba(245, 158, 11, 0.08)',
            marginBottom: '1.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Clock size={20} color="var(--warning)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--warning)' }}>
              Active In-Progress Buy Orders ({activeTransactions.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeTransactions.map((tx) => (
              <div
                key={tx.transaction_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                    Transaction: {tx.transaction_id}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Status: <span className={`badge badge-${tx.status.toLowerCase()}`}>{tx.status}</span>
                    {tx.utr && <span style={{ marginLeft: '0.75rem' }}>UTR: {tx.utr}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      const matchedPlan = plans.find(p => p.id === tx.plan_id);
                      setSelectedPlan(matchedPlan || { amount: 0 });
                      setInitiatedTx({ id: tx.transaction_id, status: tx.status });
                      setUtrInput(tx.utr || '');
                      setModalOpen(true);
                    }}
                  >
                    View / Submit UTR
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                    onClick={() => handleCancelTransaction(tx.transaction_id)}
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Plans Grid */}
      {availablePlans.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <ShoppingBag size={40} color="var(--text-subtle)" style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>No Available Plans</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            All available plans are currently active in your pending transactions or locked.
          </p>
        </div>
      ) : (
        <div className="grid-cards">
          {availablePlans.map((plan) => (
            <div
              key={plan.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                <span className="badge badge-available">AVAILABLE</span>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                  Plan Amount
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.25rem', letterSpacing: '-0.02em' }}>
                  ₹{plan.amount.toLocaleString()}
                </div>

                <div
                  style={{
                    margin: '1.25rem 0',
                    padding: '0.85rem 1rem',
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bonus Percentage:</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{plan.bonusPercentage}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bonus Amount:</span>
                    <span style={{ fontWeight: '700', color: 'var(--success)' }}>+₹{plan.bonusAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: '800', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-color)' }}>
                    <span>Total Return Credit:</span>
                    <span style={{ color: 'var(--success)' }}>₹{plan.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={() => handleInitiateBuy(plan)}
                disabled={initiating}
              >
                <Zap size={18} /> Buy Plan Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Payment Confirmation & Round-Robin Bank Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Purchase Information & Payment Account"
        maxWidth="580px"
      >
        {initiatedTx && (
          <div>
            {/* Purchase Summary */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Order Summary (Tx ID: {initiatedTx.id})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div>Plan Amount: <strong>₹{initiatedTx.planAmount?.toLocaleString() || selectedPlan?.amount?.toLocaleString()}</strong></div>
                <div>Bonus ({initiatedTx.bonusPercentage || selectedPlan?.bonusPercentage}%): <strong style={{ color: 'var(--success)' }}>+₹{initiatedTx.bonusAmount?.toLocaleString() || selectedPlan?.bonusAmount?.toLocaleString()}</strong></div>
                <div style={{ gridColumn: 'span 2', fontSize: '1rem', fontWeight: '800', color: 'var(--success)', marginTop: '0.25rem' }}>
                  Total Wallet Credit: ₹{initiatedTx.totalAmount?.toLocaleString() || selectedPlan?.totalAmount?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Payment Account Details (Round-Robin Routed) */}
            {paymentAccount && (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>
                  <Building2 size={20} /> Assigned Payment Bank Account (Round-Robin)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Account Holder:</span>
                    <span style={{ fontWeight: '700' }}>{paymentAccount.accountHolder}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bank Name:</span>
                    <span style={{ fontWeight: '700' }}>{paymentAccount.bankName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Account Number:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '0.95rem' }}>{paymentAccount.accountNumber}</span>
                      <button onClick={() => copyToClipboard(paymentAccount.accountNumber, 'Account Number')} style={{ color: 'var(--primary)' }}>
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IFSC Code:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{paymentAccount.ifsc}</span>
                      <button onClick={() => copyToClipboard(paymentAccount.ifsc, 'IFSC')} style={{ color: 'var(--primary)' }}>
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>
                  {paymentAccount.upiId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem', borderTop: '1px dashed var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>UPI ID:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: '700', color: 'var(--success)', fontFamily: 'monospace' }}>{paymentAccount.upiId}</span>
                        <button onClick={() => copyToClipboard(paymentAccount.upiId, 'UPI ID')} style={{ color: 'var(--success)' }}>
                          <Copy size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* UTR Submission Form */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                Step 2: Enter Payment UTR / Transaction Reference ID
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 423190874512"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                Please transfer the exact amount and enter the 12-digit bank UTR / transaction ID.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-success"
                style={{ flex: 1 }}
                onClick={() => handleSubmitUTR(initiatedTx.id)}
                disabled={submittingUTR}
              >
                {submittingUTR ? 'Submitting...' : 'Submit UTR For Verification'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleCancelTransaction(initiatedTx.id)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
