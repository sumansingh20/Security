'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const verify = async () => {
      await checkAuth();
      setAuthChecked(true);
    };
    verify();
  }, [checkAuth]);

  if (!authChecked || isLoading) {
    return (
      <div className="home-page">
        <div className="home-loader animate-fadeIn">
          <div className="home-logo-icon animate-pulse">PE</div>
          <p className="home-loader-text">ProctoredExam</p>
          <div className="home-spinner" />
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const dashboardUrl = user.role === 'admin' ? '/admin/dashboard' : user.role === 'teacher' ? '/teacher' : '/my';
    return (
      <div className="home-page">
        <div className="home-card animate-scaleIn">
          <div className="home-logo-icon">PE</div>
          <h1 className="home-title">Welcome back, {user.firstName}!</h1>
          <p className="home-subtitle">You are logged in as <strong>{user.role}</strong></p>
          <Link href={dashboardUrl} className="home-btn home-btn-primary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-hero animate-fadeInUp">
        <div className="home-logo-icon home-logo-lg">PE</div>
        <h1 className="home-title">ProctoredExam</h1>
        <p className="home-subtitle">Secure Proctored Examination Portal</p>
        <div className="home-features">
          <div className="home-feature animate-fadeInUp">
            <span className="home-feature-icon">🔒</span>
            <span>Secure Browser</span>
          </div>
          <div className="home-feature animate-fadeInUp">
            <span className="home-feature-icon">📹</span>
            <span>Live Proctoring</span>
          </div>
          <div className="home-feature animate-fadeInUp">
            <span className="home-feature-icon">⚡</span>
            <span>Real-time Monitoring</span>
          </div>
        </div>
        <div className="home-actions">
          <Link href="/login" className="home-btn home-btn-primary">Login to Continue</Link>
          <Link href="/help" className="home-btn home-btn-outline">Help & Support</Link>
        </div>
      </div>
    </div>
  );
}
