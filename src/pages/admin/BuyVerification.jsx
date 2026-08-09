import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { CheckSquare, CheckCircle2, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';
import { formatIST } from '../../utils/formatters';

export default function BuyVerification() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Note Modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionType, setActionType] = useState('APPROVE');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const res = await fetch('/api/admin/buy-verifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setVerifications(data.buyVerifications || []);
      } else {
        showToast(data.error || 'Failed to fetch buy verifications.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectReject = async (txId, note = 'Rejected/Cancelled by Admin') => {
    try {
      const res = await fetch(`/api/admin/buy-verifications/${txId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adminNote: note })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Transaction rejected/cancelled.', 'success');
        setModalOpen(false);
        fetchVerifications();
      } else {
        showToast(data.error || 'Failed to reject transaction.', 'error');
      }
    } catch (err) {
      showToast('Server error rejecting verification.', 'error');
    }
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!selectedTx) return;

    if (actionType === 'REJECT') {
      await handleDirectReject(selectedTx.id, adminNote || 'UTR verification failed');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/buy-verifications/${selectedTx.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adminNote })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setModalOpen(false);
        setAdminNote('');
        fetchVerifications();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error processing verification.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Buy / Purchase Verification</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Verify submitted UTRs, approve deposits to credit user wallet & bonus, or reject invalid payments.
        </p>
      </div>

      <div className="glass-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Username</th>
                <th>Mobile</th>
                <th>Plan Deposit</th>
                <th>Bonus</th>
                <th>Total Return</th>
                <th>Bank Account</th>
                <th>UTR Reference</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading verifications...
                  </td>
                </tr>
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No purchase transactions pending verification.
                  </td>
                </tr>
              ) : (
                verifications.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{tx.id}</td>
                    <td style={{ fontWeight: '700' }}>{tx.username}</td>
                    <td>{tx.mobile}</td>
                    <td>₹{tx.planAmount.toLocaleString()}</td>
                    <td>{tx.bonusPercentage}% (+₹{tx.bonusAmount.toLocaleString()})</td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>₹{tx.totalAmount.toLocaleString()}</td>
                    <td>{tx.bankName || 'Round-Robin Bank'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--warning)' }}>
                      {tx.utr || 'Not submitted yet'}
                    </td>
                    <td>
                      <span className={`badge badge-${tx.status.toLowerCase()}`}>{tx.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatIST(tx.createdAt)}
                    </td>
                    <td>
                      {tx.status === 'APPROVED' ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600' }}>Verified</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-success"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              setSelectedTx(tx);
                              setActionType('APPROVE');
                              setAdminNote('Payment Verified & Approved');
                              setModalOpen(true);
                            }}
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>

                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to reject/cancel transaction ${tx.id}?`)) {
                                handleDirectReject(tx.id, 'Payment Rejected/Cancelled by Admin');
                              }
                            }}
                          >
                            <XCircle size={14} /> Reject / Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Action Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${actionType === 'APPROVE' ? 'Approve Payment & Credit Wallet' : 'Reject Payment'} - ${selectedTx?.id}`}
      >
        {selectedTx && (
          <form onSubmit={handleProcess}>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.9rem'
              }}
            >
              <div>User: <strong>{selectedTx.username} ({selectedTx.mobile})</strong></div>
              <div>Plan Amount: <strong>₹{selectedTx.planAmount.toLocaleString()}</strong></div>
              <div>Bonus: <strong>₹{selectedTx.bonusAmount.toLocaleString()} ({selectedTx.bonusPercentage}%)</strong></div>
              <div style={{ color: 'var(--success)', fontWeight: '700', marginTop: '0.25rem' }}>
                Total Wallet Credit: ₹{selectedTx.totalAmount.toLocaleString()}
              </div>
              <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', color: 'var(--warning)' }}>
                UTR Reference: <strong>{selectedTx.utr || 'N/A'}</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Note / Remark</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter note for audit log & user notification"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="submit"
                className={`btn ${actionType === 'APPROVE' ? 'btn-success' : 'btn-danger'}`}
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : actionType === 'APPROVE' ? 'Confirm Approval & Credit' : 'Confirm Rejection'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={(e) => { e.preventDefault(); setModalOpen(false); }}>
                Close
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
