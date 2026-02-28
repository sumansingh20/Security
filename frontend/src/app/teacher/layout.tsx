'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        await checkAuth();
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    };
    verify();
    return () => { cancelled = true; };
  }, []);

  if (!authChecked) {
    return (
      <div className="auth-status-page">
        <div className="spinner" />
        <p className="auth-status-desc">Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-status-page">
        <div className="auth-status-icon expired">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="auth-status-title error">Session Expired</h1>
        <p className="auth-status-desc">Please log in again to access the teacher panel.</p>
        <a href="/login" className="auth-status-btn">Login</a>
      </div>
    );
  }

  if (user?.role !== 'admin' && user?.role !== 'teacher') {
    return (
      <div className="auth-status-page">
        <div className="auth-status-icon denied">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1 className="auth-status-title warning">Access Denied</h1>
        <p className="auth-status-desc">You do not have permission to access this area.</p>
        <a href="/my" className="auth-status-btn">Go to Student Portal</a>
      </div>
    );
  }

  return <>{children}</>;
}
