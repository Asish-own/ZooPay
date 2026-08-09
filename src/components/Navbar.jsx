import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  ArrowUpRight,
  History,
  Users,
  MessageSquare,
  LogOut,
  ShieldAlert,
  Wallet,
  Settings,
  Layers,
  CheckSquare,
  CreditCard
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, admin, role, logout } = useAuth();

  return (
    <>
      {/* Top Desktop/Header Bar */}
      <header
        style={{
          height: '70px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 800
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              color: 'white',
              fontSize: '1.2rem',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}
          >
            ZP
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
              Zoo<span style={{ color: 'var(--primary)' }}>Pay</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
              {role === 'ADMIN' ? 'Admin Portal' : 'Buy/Sell Platform'}
            </div>
          </div>
        </div>

        {/* User / Admin details & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {role === 'USER' && user && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.mobile}</div>
            </div>
          )}
          {role === 'ADMIN' && admin && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--warning)' }}>Admin Panel</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{admin.username}</div>
            </div>
          )}

          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
            title="Logout"
          >
            <LogOut size={16} />
            <span className="desktop-only" style={{ display: 'none' }}>Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      {role === 'USER' && (
        <nav className="bottom-nav">
          <button
            className={`nav-item-mobile ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item-mobile ${activeTab === 'buy' ? 'active' : ''}`}
            onClick={() => setActiveTab('buy')}
          >
            <ShoppingBag size={20} />
            <span>Buy</span>
          </button>
          <button
            className={`nav-item-mobile ${activeTab === 'sell' ? 'active' : ''}`}
            onClick={() => setActiveTab('sell')}
          >
            <ArrowUpRight size={20} />
            <span>Sell</span>
          </button>
          <button
            className={`nav-item-mobile ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            <span>History</span>
          </button>
          <button
            className={`nav-item-mobile ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            <Users size={20} />
            <span>Referrals</span>
          </button>
        </nav>
      )}

      {/* Mobile Bottom Navigation for Admin */}
      {role === 'ADMIN' && (
        <nav className="bottom-nav">
          <button
            className={`nav-item-mobile ${activeTab === 'admin-dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item-mobile ${activeTab === 'admin-buy-verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-buy-verification')}
          >
            <CheckSquare size={20} />
            <span>Verify UTR</span>
          </button>
          <button
            className={`nav-item-mobile ${activeTab === 'admin-withdrawals' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-withdrawals')}
          >
            <ArrowUpRight size={20} />
            <span>Withdrawals</span>
          </button>
          <button
            className={`nav-item-mobile ${activeTab === 'admin-users' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-users')}
          >
            <Users size={20} />
            <span>Users</span>
          </button>
          <button
            className={`nav-item-mobile ${activeTab === 'admin-plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-plans')}
          >
            <Layers size={20} />
            <span>Plans</span>
          </button>
        </nav>
      )}
    </>
  );
}
