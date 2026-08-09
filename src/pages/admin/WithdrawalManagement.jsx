import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { ArrowUpRight, CheckCircle2, XCircle, Send, Wallet, Info } from 'lucide-react';
import { formatIST } from '../../utils/formatters';

export default function WithdrawalManagement() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Payout
  const [selectedReq, setSelectedReq] = useState(null);
  const [amountToPay, setAmountToPay] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [actionType, setActionType] = useState('MARK_PAID');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const res = await fetch('/api/admin/withdrawals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(data.withdrawalRequests || []);
      } else {
        showToast(data.error || 'Failed to fetch withdrawal requests.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessWithdrawal = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    if (actionType === 'MARK_PAID') {
      const payoutNum = parseFloat(amountToPay);
      if (isNaN(payoutNum) || payoutNum <= 0) {
        showToast('Please enter a valid payout amount greater than 0.', 'warning');
        return;
      }

      if (payoutNum > selectedReq.userAvailableBalance) {
        showToast(`Payout amount (₹${payoutNum}) exceeds user available balance (₹${selectedReq.userAvailableBalance}).`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${selectedReq.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: actionType === 'MARK_PAID' ? 'MARK_PAID' : 'REJECT',
          amountToPay: parseFloat(amountToPay) || 0,
          referenceId: referenceId.trim(),
          adminNote: adminNote.trim()
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setModalOpen(false);
        fetchWithdrawals();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error processing withdrawal payout.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Withdrawal Payout Management</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Admin decides the exact "Amount to Pay" for user withdrawal requests and marks payout as PAID.
        </p>
      </div>

      <div className="glass-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Withdrawal ID</th>
                <th>User</th>
                <th>Available Balance</th>
                <th>Selected UPI ID</th>
                <th>Amount Paid</th>
                <th>Status</th>
                <th>Bank Reference</th>
                <th>Request Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading withdrawal requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{req.id}</td>
                    <td>
                      <div style={{ fontWeight: '700' }}>{req.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.mobile}</div>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                      ₹{(req.userAvailableBalance || 0).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--success)' }}>
                      {req.upiString}
                    </td>
                    <td style={{ fontWeight: '800', color: req.amountPaid ? 'var(--success)' : 'var(--warning)' }}>
                      {req.amountPaid ? `₹${req.amountPaid.toLocaleString()}` : 'Admin Decision Needed'}
                    </td>
                    <td>
                      <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{req.referenceId || '-'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatIST(req.createdAt)}
                    </td>
                    <td>
                      {req.status === 'PAID' ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '600' }}>PAID</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-success"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              setSelectedReq(req);
                              setActionType('MARK_PAID');
                              setAmountToPay(req.userAvailableBalance > 0 ? String(req.userAvailableBalance) : '0');
                              setReferenceId('');
                              setAdminNote('Payout approved and transferred');
                              setModalOpen(true);
                            }}
                          >
                            <Send size={14} /> Set Payout & Pay
                          </button>

                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                            onClick={() => {
                              setSelectedReq(req);
                              setActionType('REJECT');
                              setAmountToPay('0');
                              setReferenceId('');
                              setAdminNote('Withdrawal rejected');
                              setModalOpen(true);
                            }}
                          >
                            <XCircle size={14} /> Reject
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

      {/* Admin Payout Decision Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={actionType === 'MARK_PAID' ? `Set Payout Amount & Mark Paid (${selectedReq?.id})` : `Reject Withdrawal (${selectedReq?.id})`}
      >
        {selectedReq && (
          <form onSubmit={handleProcessWithdrawal}>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.9rem'
              }}
            >
              <div>User: <strong>{selectedReq.username} ({selectedReq.mobile})</strong></div>
              <div>User Available Balance: <strong style={{ color: 'var(--primary)' }}>₹{selectedReq.userAvailableBalance?.toLocaleString()}</strong></div>
              <div>Destination UPI ID: <strong style={{ color: 'var(--success)', fontFamily: 'monospace' }}>{selectedReq.upiString}</strong></div>
            </div>

            {actionType === 'MARK_PAID' && (
              <>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700', color: 'var(--success)' }}>
                    Amount to Pay (Admin Decision)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Enter payout amount (e.g. 3000)"
                    value={amountToPay}
                    onChange={(e) => setAmountToPay(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    Admin determines the exact payout amount to be paid out and debited from user balance.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Bank Transaction / UTR / Reference ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. UPI/423198075412"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Admin Note</label>
              <input
                type="text"
                className="form-control"
                placeholder="Optional note for user & audit log"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="submit"
                className={`btn ${actionType === 'MARK_PAID' ? 'btn-success' : 'btn-danger'}`}
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : actionType === 'MARK_PAID' ? 'Confirm & Mark as PAID' : 'Confirm Rejection'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
