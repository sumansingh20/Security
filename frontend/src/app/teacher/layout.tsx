'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * TEACHER LAYOUT - CRASH-PROOF
 * NO auto-redirect loops
 * Shows session expired message instead of redirecting
 */
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

  // Show loading only while auth check is in progress
  if (!authChecked) {
    return (
      <div className="lms-loading-page">
        <div>Verifying authentication...</div>
      </div>
    );
  }

  // Session expired - show message, no redirect
  if (!isAuthenticated) {
    return (
      <div className="lms-loading-page" style={{ flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>Session Expired</div>
        <div style={{ color: '#6b7280' }}>Please log in again to access the teacher panel.</div>
        <a href="/login" style={{ padding: '12px 24px', backgroundColor: '#1e40af', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Login</a>
      </div>
    );
  }

  // Wrong role - students go to their area
  if (user?.role !== 'admin' && user?.role !== 'teacher') {
    return (
      <div className="lms-loading-page" style={{ flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>Access Denied</div>
        <div style={{ color: '#6b7280' }}>You don't have permission to access this area.</div>
        <a href="/my" style={{ padding: '12px 24px', backgroundColor: '#1e40af', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>Go to Student Portal</a>
      </div>
    );
  }

  return <>{children}</>;
}
