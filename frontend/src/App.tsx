import React, { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ToastContainer, ToastMessage } from './components/UI/Toast';
import { UserProfile } from './types';
import { api } from './lib/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      message
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await api.getMe();
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.log('Session check: Not authenticated');
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleDemoLogin = async () => {
    try {
      const data = await api.loginGoogle(undefined, {
        googleId: 'demo-admin-1',
        name: 'ReachInbox Admin User',
        email: 'admin@reachinbox.ai',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      });
      setUser(data.user);
      addToast('Logged in as ReachInbox Admin User!', 'success');
    } catch (err: any) {
      addToast(`Login Error: ${err.message}`, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      addToast('Logged out successfully', 'info');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Outbox Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onShowToast={(msg, type) => addToast(msg, type || 'info')}
        />
      ) : (
        <Login
          onLoginSuccess={(u) => setUser(u)}
          onDemoLogin={handleDemoLogin}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </>
  );
};

export default App;
