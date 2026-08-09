import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import {
  ArrowUpRight,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  Info
} from 'lucide-react';

export default function SellPage() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [upis, setUpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpiId, setSelectedUpiId] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  // Bank Profile State
  const [bankProfile, setBankProfile] = useState({
    bankHolderName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    bankUpiId: ''
  });
  const [isEligible, setIsEligible] = useState(false);
  const [savingBankProfile, setSavingBankProfile] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);

  // Add/Edit UPI Modal State
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [editingUpi, setEditingUpi] = useState(null);
  const [upiInput, setUpiInput] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchBankProfile(), fetchUPIs()]);
    setLoading(false);
  };

  const fetchBankProfile = async () => {
    try {
      const res = await fetch('/api/user/bank-profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBankProfile(data.bankProfile || {});
        setIsEligible(data.isEligibleForWithdrawal);
      }
    } catch (err) {
      console.error('Error fetching bank profile:', err);
    }
  };

  const fetchUPIs = async () => {
    try {
      const res = await fetch('/api/user/upi', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUpis(data.upis || []);
        const activeUpi = (data.upis || []).find((u) => u.status === 'ACTIVE');
        if (activeUpi) {
          setSelectedUpiId(activeUpi.id);
        }
      } else {
        showToast(data.error || 'Failed to fetch UPI accounts.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    }
  };

  const handleSaveBankProfile = async (e) => {
    e.preventDefault();

    setSavingBankProfile(true);
    try {
      const res = await fetch('/api/user/bank-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bankProfile)
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setBankModalOpen(false);
        fetchData();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error while saving bank profile.', 'error');
    } finally {
      setSavingBankProfile(false);
    }
  };

  const handleSaveUPI = async (e) => {
    e.preventDefault();
    if (!upiInput || !upiInput.trim()) {
      showToast('Please enter a valid UPI ID.', 'warning');
      return;
    }

    setSavingUpi(true);
    try {
      const url = editingUpi ? `/api/user/upi/${editingUpi.id}` : '/api/user/upi';
      const method = editingUpi ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ upiId: upiInput.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'UPI ID saved.', 'success');
        setUpiModalOpen(false);
        setUpiInput('');
        setEditingUpi(null);
        fetchUPIs();
      } else {
        showToast(data.error || 'Failed to save UPI ID.', 'error');
      }
    } catch (err) {
      showToast('Server error while saving UPI ID.', 'error');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleDeleteUPI = async (id) => {
    if (!window.confirm('Are you sure you want to remove this UPI ID?')) return;

    try {
      const res = await fetch(`/api/user/upi/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'UPI ID deleted.', 'info');
        fetchUPIs();
      } else {
        showToast(data.error || 'Failed to delete UPI ID.', 'error');
      }
    } catch (err) {
      showToast('Server error during deletion.', 'error');
    }
  };

  const handleWithdrawalRequest = async (e) => {
    e.preventDefault();

    if (!selectedUpiId) {
      showToast('Please select an ACTIVE UPI ID for withdrawal.', 'warning');
      return;
    }

    setSubmittingWithdrawal(true);
    try {
      const res = await fetch('/api/user/withdraw/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userUpiId: selectedUpiId })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Withdrawal request submitted to Admin.', 'success');
      } else {
        showToast(data.error || 'Failed to submit withdrawal request.', 'error');
      }
    } catch (err) {
      showToast('Server error while submitting withdrawal.', 'error');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Sell & Withdrawal options...
      </div>
    );
  }

  const activeUPIs = upis.filter((u) => u.status === 'ACTIVE');

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Sell / Withdrawal Section</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Add your active UPI accounts to receive withdrawal payouts directly into your bank.
        </p>
      </div>

      {/* CRITICAL WITHDRAWAL RULE NOTICE BANNER */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderColor: 'var(--primary)',
          marginBottom: '1.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div style={{ padding: '0.5rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
            <Info size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)' }}>
              Important Platform Withdrawal Rule
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.35rem', lineHeight: '1.5' }}>
              <strong>Withdrawal requests are processed by Admin.</strong> The user does not enter an amount. Admin evaluates your available balance and approves the exact payout amount to your selected active UPI ID.
            </p>
          </div>
        </div>
      </div>

      {/* BANK DETAILS PROFILE CARD (REQUIRED FOR WITHDRAWAL) */}
      <div className="glass-card" style={{ marginBottom: '1.75rem', borderColor: isEligible ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Your Bank Details Profile</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isEligible ? (
              <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem' }}>
                <CheckCircle2 size={14} style={{ marginRight: '0.3rem' }} /> WITHDRAWAL ELIGIBLE
              </span>
            ) : (
              <span className="badge badge-danger" style={{ padding: '0.35rem 0.75rem' }}>
                <AlertTriangle size={14} style={{ marginRight: '0.3rem' }} /> INCOMPLETE - WITHDRAWAL LOCKED
              </span>
            )}

            <button className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }} onClick={() => setBankModalOpen(true)}>
              <Edit2 size={15} /> {isEligible ? 'Edit Bank Details' : 'Add Required Bank Details'}
            </button>
          </div>
        </div>

        {isEligible ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Account Holder Name</span>
              <div style={{ fontWeight: '700', marginTop: '0.2rem' }}>{bankProfile.bankHolderName}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Bank Name</span>
              <div style={{ fontWeight: '700', marginTop: '0.2rem' }}>{bankProfile.bankName}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Account Number</span>
              <div style={{ fontWeight: '700', fontFamily: 'monospace', marginTop: '0.2rem' }}>{bankProfile.bankAccountNumber}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>IFSC Code</span>
              <div style={{ fontWeight: '700', fontFamily: 'monospace', marginTop: '0.2rem' }}>{bankProfile.bankIfsc}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Registered UPI ID</span>
              <div style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--success)', marginTop: '0.2rem' }}>{bankProfile.bankUpiId}</div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem', color: 'var(--danger)' }}>
            ⚠️ <strong>Action Required:</strong> You must enter and save your complete bank details (Account Name, Bank Name, Account Number, IFSC, and UPI ID) to enable withdrawal requests.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Submit Withdrawal Request Box */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <ArrowUpRight size={22} color="var(--success)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Submit Withdrawal Request</h2>
          </div>

          <form onSubmit={handleWithdrawalRequest}>
            <div className="form-group">
              <label className="form-label">Select Active UPI ID for Payout</label>
              {activeUPIs.length === 0 ? (
                <div style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                  No active UPI ID available. Please add an active UPI ID below before requesting a withdrawal.
                </div>
              ) : (
                <select
                  className="form-control"
                  value={selectedUpiId}
                  onChange={(e) => setSelectedUpiId(e.target.value)}
                  required
                >
                  {activeUPIs.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.upiId} (ACTIVE)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Note on Payout:</div>
              Your available wallet balance will be reviewed by Admin, who will determine and credit the payout directly to your selected UPI ID.
            </div>

            <button
              type="submit"
              className="btn btn-success btn-full"
              disabled={submittingWithdrawal || activeUPIs.length === 0}
            >
              <Send size={18} />
              {submittingWithdrawal ? 'Submitting Request...' : 'Submit Withdrawal Request'}
            </button>
          </form>
        </div>

        {/* User UPI Management Box */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={22} color="var(--primary)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Your UPI Accounts</h2>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => {
                setEditingUpi(null);
                setUpiInput('');
                setUpiModalOpen(true);
              }}
            >
              <Plus size={16} /> Add UPI
            </button>
          </div>

          {upis.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              You have not added any UPI ID yet. Click "Add UPI" above to register your payout account.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upis.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.85rem 1rem',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                      {u.upiId}
                    </div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <span className={`badge badge-${u.status.toLowerCase()}`}>{u.status}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem' }}
                      onClick={() => {
                        setEditingUpi(u);
                        setUpiInput(u.upiId);
                        setUpiModalOpen(true);
                      }}
                      title="Edit UPI"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', color: 'var(--danger)' }}
                      onClick={() => handleDeleteUPI(u.id)}
                      title="Delete UPI"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit UPI Modal */}
      <Modal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        title={editingUpi ? 'Edit UPI Account' : 'Add New UPI Account'}
      >
        <form onSubmit={handleSaveUPI}>
          <div className="form-group">
            <label className="form-label">UPI ID (VPA)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. yourname@upi or mobile@paytm"
              value={upiInput}
              onChange={(e) => setUpiInput(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              Ensure your UPI ID is valid and active to receive payouts without delays.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingUpi}>
              {savingUpi ? 'Saving...' : 'Save UPI ID'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setUpiModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Bank Details Profile Modal */}
      <Modal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        title="Bank & Payment Profile Details (Required for Withdrawal)"
      >
        <form onSubmit={handleSaveBankProfile}>
          <div className="form-group">
            <label className="form-label">Account Holder Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Full name as registered in bank"
              value={bankProfile.bankHolderName || ''}
              onChange={(e) => setBankProfile({ ...bankProfile, bankHolderName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bank Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. State Bank of India, HDFC Bank, ICICI"
              value={bankProfile.bankName || ''}
              onChange={(e) => setBankProfile({ ...bankProfile, bankName: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Bank account number"
                value={bankProfile.bankAccountNumber || ''}
                onChange={(e) => setBankProfile({ ...bankProfile, bankAccountNumber: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. SBIN0001234"
                value={bankProfile.bankIfsc || ''}
                onChange={(e) => setBankProfile({ ...bankProfile, bankIfsc: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registered UPI ID</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. name@upi or mobile@paytm"
              value={bankProfile.bankUpiId || ''}
              onChange={(e) => setBankProfile({ ...bankProfile, bankUpiId: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              This UPI ID will be saved as your primary destination for withdrawal payouts.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingBankProfile}>
              {savingBankProfile ? 'Saving Bank Details...' : 'Save & Verify Eligibility'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setBankModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
