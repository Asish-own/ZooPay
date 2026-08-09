import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { Layers, Plus, Edit2, Trash2, Power, Zap } from 'lucide-react';

export default function BuyPlanManagement() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Plan Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [amount, setAmount] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState('3.0');
  const [status, setStatus] = useState('AVAILABLE');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPlans(data.plans || []);
      } else {
        showToast(data.error || 'Failed to fetch admin plans.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid plan amount.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          bonusPercentage: parseFloat(bonusPercentage),
          status
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setModalOpen(false);
        fetchPlans();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error saving plan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this buy plan?')) return;

    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'info');
        fetchPlans();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Server error deleting plan.', 'error');
    }
  };

  return (
    <div className="content-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Buy Plan Management (CRUD)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Add, edit, or configure buy plans of any custom amount (e.g. ₹100, ₹500, ₹1k, ₹2.5k, ₹5k, ₹10k, ₹25k).
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingPlan(null);
            setAmount('');
            setBonusPercentage('3.0');
            setStatus('AVAILABLE');
            setModalOpen(true);
          }}
        >
          <Plus size={18} /> Add New Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid-cards">
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            No buy plans created yet. Click "Add New Plan" to create one.
          </div>
        ) : (
          plans.map((p) => (
            <div key={p.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-info">Plan #{p.id}</span>
                  <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                </div>

                <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.75rem' }}>
                  ₹{p.amount.toLocaleString()}
                </div>

                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Bonus: <strong style={{ color: 'var(--success)' }}>{p.bonusPercentage}%</strong> (+₹{((p.amount * p.bonusPercentage) / 100).toLocaleString()})
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Total Return: <strong>₹{(p.amount + (p.amount * p.bonusPercentage) / 100).toLocaleString()}</strong>
                </div>

                {p.activeBuyersCount > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--warning)', fontWeight: '600' }}>
                    Active Buyers: {p.activeBuyersCount} transaction(s) in progress
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.4rem' }}
                  onClick={() => {
                    setEditingPlan(p);
                    setAmount(p.amount);
                    setBonusPercentage(p.bonusPercentage);
                    setStatus(p.status);
                    setModalOpen(true);
                  }}
                >
                  <Edit2 size={15} /> Edit
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.65rem', color: 'var(--danger)' }}
                  onClick={() => handleDeletePlan(p.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Plan Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan ? `Edit Plan #${editingPlan.id}` : 'Add New Buy Plan'}
      >
        <form onSubmit={handleSavePlan}>
          <div className="form-group">
            <label className="form-label">Plan Amount (₹)</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 500, 1000, 2000, 5000, 10000, 25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bonus Percentage (%)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 3.0"
              value={bonusPercentage}
              onChange={(e) => setBonusPercentage(e.target.value)}
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
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="DEACTIVATED">DEACTIVATED</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? 'Saving Plan...' : 'Save Buy Plan'}
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
