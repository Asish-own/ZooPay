import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { CreditCard, Plus, Edit2, Trash2, RotateCcw, Building2 } from 'lucide-react';

export default function AccountManagement() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [displayLimit, setDisplayLimit] = useState('5');
  const [status, setStatus] = useState('ACTIVE');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/admin/accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
      } else {
        showToast(data.error || 'Failed to fetch payment accounts.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();

    if (!accountHolder || !bankName || !accountNumber || !ifsc) {
      showToast('Please fill in Account Holder, Bank Name, Account Number, and IFSC.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingAccount ? `/api/admin/accounts/${editingAccount.id}` : '/api/admin/accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          accountHolder,
          bankName,
          accountNumber,
          ifsc,
          upiId,
          displayLimit: parseInt(displayLimit) || 5,
          status
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setModalOpen(false);
        fetchAccounts();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error saving bank account.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetCounter = async (id) => {
    try {
      const res = await fetch(`/api/admin/accounts/${id}/reset-counter`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'info');
        fetchAccounts();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Error resetting usage counter.', 'error');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bank account from the Round-Robin pool?')) return;

    try {
      const res = await fetch(`/api/admin/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'info');
        fetchAccounts();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error deleting bank account.', 'error');
    }
  };

  return (
    <div className="content-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Bank Accounts (Round-Robin Routing)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            System automatically cycles active accounts based on configured display limits (e.g. Account A: 3 times to Account B: 5 times).
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingAccount(null);
            setAccountHolder('');
            setBankName('');
            setAccountNumber('');
            setIfsc('');
            setUpiId('');
            setDisplayLimit('5');
            setStatus('ACTIVE');
            setModalOpen(true);
          }}
        >
          <Plus size={18} /> Add Payment Account
        </button>
      </div>

      <div className="glass-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Account Holder</th>
                <th>Bank Name</th>
                <th>Account Number</th>
                <th>IFSC Code</th>
                <th>UPI ID</th>
                <th>Display Limit</th>
                <th>Current Usage Count</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading bank accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No payment accounts added.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td style={{ fontWeight: '700' }}>{acc.accountHolder}</td>
                    <td>{acc.bankName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{acc.accountNumber}</td>
                    <td style={{ fontFamily: 'monospace' }}>{acc.ifsc}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--success)' }}>{acc.upiId || '-'}</td>
                    <td style={{ fontWeight: '700' }}>{acc.displayLimit} times</td>
                    <td>
                      <span className={`badge ${acc.currentDisplayCount >= acc.displayLimit ? 'badge-warning' : 'badge-info'}`}>
                        {acc.currentDisplayCount} / {acc.displayLimit}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${acc.status.toLowerCase()}`}>{acc.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleResetCounter(acc.id)}
                          title="Reset Usage Count to 0"
                        >
                          <RotateCcw size={14} /> Reset
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => {
                            setEditingAccount(acc);
                            setAccountHolder(acc.accountHolder);
                            setBankName(acc.bankName);
                            setAccountNumber(acc.accountNumber);
                            setIfsc(acc.ifsc);
                            setUpiId(acc.upiId || '');
                            setDisplayLimit(acc.displayLimit);
                            setStatus(acc.status);
                            setModalOpen(true);
                          }}
                          title="Edit Account"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                          onClick={() => handleDeleteAccount(acc.id)}
                          title="Delete Account"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAccount ? 'Edit Bank Account' : 'Add Bank Account for Round-Robin'}
      >
        <form onSubmit={handleSaveAccount}>
          <div className="form-group">
            <label className="form-label">Account Holder Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. ZooPay Enterprises"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bank Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. HDFC Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Number</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 50200012345678"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">IFSC Code</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. HDFC0001234"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">UPI ID (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. zoopay@hdfcbank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Display Limit (Round-Robin count before switching)</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 3 or 5"
              value={displayLimit}
              onChange={(e) => setDisplayLimit(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? 'Saving Account...' : 'Save Bank Account'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
