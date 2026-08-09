import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('zoopay_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.role === 'USER') {
          setUser(data.user);
          setRole('USER');
        } else if (data.role === 'ADMIN') {
          setAdmin(data.admin);
          setRole('ADMIN');
        }
      } else {
        logout();
      }
    } catch (err) {
      console.error('Auth verification failed:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loginUser = (userObj, tokenStr) => {
    localStorage.setItem('zoopay_token', tokenStr);
    setToken(tokenStr);
    setUser(userObj);
    setRole('USER');
    setAdmin(null);
  };

  const loginAdmin = (adminObj, tokenStr) => {
    localStorage.setItem('zoopay_token', tokenStr);
    setToken(tokenStr);
    setAdmin(adminObj);
    setRole('ADMIN');
    setUser(null);
  };

  const logout = () => {
    localStorage.removeItem('zoopay_token');
    setToken(null);
    setUser(null);
    setAdmin(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        role,
        token,
        loading,
        loginUser,
        loginAdmin,
        logout,
        refreshUser: fetchMe
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
