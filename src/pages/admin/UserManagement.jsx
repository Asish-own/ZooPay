import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { Users, Search, Filter, Key, Power, UserCheck, Shield } from 'lucide-react';
import { formatIST } from '../../utils/formatters';

export default function UserManagement() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter]);

  const fetchUsers = async () => {
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter !== 'ALL') query.append('status', statusFilter);

      const res = await fetch(`/api/admin/users?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        showToast(data.error || 'Failed to fetch users.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userObj) => {
    const newStatus = userObj.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change status of ${userObj.username} to ${newStatus}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userObj.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchUsers();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error while updating status.', 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'warning');
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setResetModalOpen(false);
        setNewPassword('');
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error resetting password.', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>User Management</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Search, view profile balances, toggle account activation, and reset passwords.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.75rem' }}
              placeholder="Search by username or mobile number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE Only</option>
            <option value="DEACTIVATED">DEACTIVATED Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Mobile Number</th>
                <th>Referral Code</th>
                <th>Referred By</th>
                <th>Available Balance</th>
                <th>Status</th>
                <th>Registration Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No matching users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td style={{ fontWeight: '700' }}>{u.username}</td>
                    <td>{u.mobile}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{u.referralCode}</td>
                    <td>{u.referredByUsername || '-'}</td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>₹{u.balance.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${u.status.toLowerCase()}`}>{u.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatIST(u.createdAt)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className={`btn ${u.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'}`}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleToggleStatus(u)}
                          title={u.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                        >
                          <Power size={14} />
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => {
                            setTargetUser(u);
                            setNewPassword('');
                            setResetModalOpen(true);
                          }}
                          title="Reset Password"
                        >
                          <Key size={14} /> Password
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

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={`Reset Password for ${targetUser?.username}`}
      >
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={resetting}>
              {resetting ? 'Resetting...' : 'Update Password'}
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
