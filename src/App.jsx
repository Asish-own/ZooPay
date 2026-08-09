import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// User Pages
import UserLogin from './pages/user/Login';
import UserRegister from './pages/user/Register';
import UserDashboard from './pages/user/Dashboard';
import BuyPage from './pages/user/BuyPage';
import SellPage from './pages/user/SellPage';
import HistoryPage from './pages/user/HistoryPage';
import ReferralsPage from './pages/user/ReferralsPage';
import ContactPage from './pages/user/ContactPage';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import BuyPlanManagement from './pages/admin/BuyPlanManagement';
import AccountManagement from './pages/admin/AccountManagement';
import BuyVerification from './pages/admin/BuyVerification';
import WithdrawalManagement from './pages/admin/WithdrawalManagement';
import SettingsManagement from './pages/admin/SettingsManagement';
import AuditLogs from './pages/admin/AuditLogs';

function MainApp() {
  const { role, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | 'admin-login'
  const [activeTab, setActiveTab] = useState(role === 'ADMIN' ? 'admin-dashboard' : 'dashboard');

  React.useEffect(() => {
    if (role === 'ADMIN' && !activeTab.startsWith('admin-')) {
      setActiveTab('admin-dashboard');
    } else if (role === 'USER' && activeTab.startsWith('admin-')) {
      setActiveTab('dashboard');
    }
  }, [role]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--text-muted)' }}>
        Loading ZooPay Platform...
      </div>
    );
  }

  // Unauthenticated Views
  if (!role) {
    const isSecretAdminRoute = window.location.pathname === '/zoopayadmin2026';

    if (isSecretAdminRoute || authView === 'admin-login') {
      return (
        <AdminLogin
          onSwitchToUser={() => {
            window.history.pushState({}, '', '/');
            setAuthView('login');
          }}
        />
      );
    }
    if (authView === 'register') {
      return <UserRegister onSwitchToLogin={() => setAuthView('login')} />;
    }
    return (
      <UserLogin
        onSwitchToRegister={() => setAuthView('register')}
      />
    );
  }

  // User Authenticated Layout
  if (role === 'USER') {
    return (
      <div className="app-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="main-content">
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === 'dashboard' && <UserDashboard setActiveTab={setActiveTab} />}
          {activeTab === 'buy' && <BuyPage />}
          {activeTab === 'sell' && <SellPage />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'referrals' && <ReferralsPage />}
          {activeTab === 'contact' && <ContactPage />}
        </div>
      </div>
    );
  }

  // Admin Authenticated Layout
  if (role === 'ADMIN') {
    return (
      <div className="app-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="main-content">
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

          {activeTab === 'admin-dashboard' && <AdminDashboard setActiveTab={setActiveTab} />}
          {activeTab === 'admin-buy-verification' && <BuyVerification />}
          {activeTab === 'admin-withdrawals' && <WithdrawalManagement />}
          {activeTab === 'admin-users' && <UserManagement />}
          {activeTab === 'admin-plans' && <BuyPlanManagement />}
          {activeTab === 'admin-accounts' && <AccountManagement />}
          {activeTab === 'admin-settings' && <SettingsManagement />}
          {activeTab === 'admin-audit-logs' && <AuditLogs />}
        </div>
      </div>
    );
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
