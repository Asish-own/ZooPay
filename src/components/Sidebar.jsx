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
  Shield,
  CreditCard,
  CheckSquare,
  Layers,
  Settings,
  FileText,
  Gift
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { role, logout } = useAuth();

  if (role === 'USER') {
    const navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'buy', label: 'Buy Plans', icon: ShoppingBag },
      { id: 'sell', label: 'Sell / Withdraw', icon: ArrowUpRight },
      { id: 'history', label: 'Transaction History', icon: History },
      { id: 'referrals', label: 'Referrals', icon: Users },
      { id: 'contact', label: 'Support & Contact', icon: MessageSquare }
    ];

    return (
      <aside
        style={{
          width: '260px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRight: '1px solid var(--border-color)',
          height: 'calc(100vh - 70px)',
          position: 'fixed',
          top: '70px',
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.5rem 1rem',
          zIndex: 700
        }}
        className="desktop-sidebar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-subtle)', paddingLeft: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            User Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive ? 'linear-gradient(90deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
              >
                <Icon size={20} color={isActive ? 'var(--primary)' : 'currentColor'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              width: '100%',
              padding: '0.75rem 1rem',
              color: 'var(--danger)',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    );
  }

  if (role === 'ADMIN') {
    const adminNavItems = [
      { id: 'admin-dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
      { id: 'admin-buy-verification', label: 'Buy Verification', icon: CheckSquare },
      { id: 'admin-withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
      { id: 'admin-users', label: 'User Management', icon: Users },
      { id: 'admin-plans', label: 'Buy Plans', icon: Layers },
      { id: 'admin-accounts', label: 'Round-Robin Accounts', icon: CreditCard },
      { id: 'admin-settings', label: 'Bonus Settings', icon: Settings },
      { id: 'admin-audit-logs', label: 'Audit Logs', icon: FileText }
    ];

    return (
      <aside
        style={{
          width: '260px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRight: '1px solid var(--border-color)',
          height: 'calc(100vh - 70px)',
          position: 'fixed',
          top: '70px',
          left: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.5rem 1rem',
          zIndex: 700
        }}
        className="desktop-sidebar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--warning)', paddingLeft: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Admin Control Panel
          </div>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive ? 'linear-gradient(90deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--warning)' : '3px solid transparent',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
              >
                <Icon size={18} color={isActive ? 'var(--warning)' : 'currentColor'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              width: '100%',
              padding: '0.75rem 1rem',
              color: 'var(--danger)',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}
          >
            <LogOut size={18} />
            <span>Logout Admin</span>
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
