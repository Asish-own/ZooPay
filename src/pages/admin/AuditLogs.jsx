import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FileText, ShieldAlert } from 'lucide-react';
import { formatIST } from '../../utils/formatters';

export default function AuditLogs() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.auditLogs || []);
      } else {
        showToast(data.error || 'Failed to fetch audit logs.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-wrapper">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Admin Action Audit Trail</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Complete tamper-evident audit history of all administrative actions, bonus changes, bank routing resets, and payout approvals.
        </p>
      </div>

      <div className="glass-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Admin User</th>
                <th>Action Performed</th>
                <th>Target Resource</th>
                <th>Previous Value</th>
                <th>New Value</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td style={{ fontWeight: '700', color: 'var(--warning)' }}>{item.adminUsername || 'Admin'}</td>
                    <td>
                      <span className="badge badge-info">{item.action}</span>
                    </td>
                    <td>{item.target || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.previousValue || '-'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.newValue || '-'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.ipAddress}</td>
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
    </div>
  );
}
