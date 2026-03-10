'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

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
        <p className="auth-status-desc">Loading student portal...</p>
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
        <p className="auth-status-desc">Please log in again to access the student portal.</p>
        <a href="/login" className="auth-status-btn">Login</a>
      </div>
    );
  }

  if (user?.role === 'admin') {
    if (typeof window !== 'undefined') router.replace('/admin/dashboard');
    return (
      <div className="auth-status-page">
        <div className="auth-status-icon redirect">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
        <p className="auth-status-desc">Redirecting to admin panel...</p>
        <a href="/admin/dashboard" className="auth-status-btn">Go to Admin Dashboard</a>
      </div>
    );
  }

  if (user?.role === 'teacher') {
    if (typeof window !== 'undefined') router.replace('/teacher');
    return (
      <div className="auth-status-page">
        <div className="auth-status-icon redirect">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
        <p className="auth-status-desc">Redirecting to teacher panel...</p>
        <a href="/teacher" className="auth-status-btn">Go to Teacher Panel</a>
      </div>
    );
  }

  return <>{children}</>;
}
