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
        {/* Floating background shapes */}
        <div className="home-bg-shapes" aria-hidden="true">
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
        </div>
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
        <div className="home-bg-shapes" aria-hidden="true">
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
          <div className="home-bg-shape" />
        </div>
        <div className="home-card">
          <div className="home-logo-icon animate-glow-pulse home-logo-centered">PE</div>
          <h1 className="home-title">Welcome back, {user.firstName}!</h1>
          <p className="home-subtitle">Logged in as <strong className="home-user-role">{user.role}</strong></p>
          <Link href={dashboardUrl} className="home-btn home-btn-primary">
            <span className="home-btn-icon">⚡</span>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Animated floating background shapes */}
      <div className="home-bg-shapes" aria-hidden="true">
        <div className="home-bg-shape" />
        <div className="home-bg-shape" />
        <div className="home-bg-shape" />
        <div className="home-bg-shape" />
        <div className="home-bg-shape" />
        <div className="home-bg-shape" />
      </div>

      <div className="home-hero">
        {/* 3D animated logo */}
        <div className="home-logo-icon home-logo-lg">PE</div>

        <h1 className="home-title">ProctoredExam</h1>
        <p className="home-subtitle">
          The most secure, AI-powered proctored examination portal
          <br />
          <span className="home-subtitle-small">for educational institutions worldwide.</span>
        </p>

        {/* Feature pills with 3D hover */}
        <div className="home-features">
          <div className="home-feature">
            <span className="home-feature-icon">🔒</span>
            <span>Secure Browser</span>
          </div>
          <div className="home-feature">
            <span className="home-feature-icon">📹</span>
            <span>Live Proctoring</span>
          </div>
          <div className="home-feature">
            <span className="home-feature-icon">📊</span>
            <span>Real-time Monitoring</span>
          </div>
          <div className="home-feature">
            <span className="home-feature-icon">🛡️</span>
            <span>Anti-Cheating</span>
          </div>
          <div className="home-feature">
            <span className="home-feature-icon">⚡</span>
            <span>Instant Results</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="home-actions">
          <Link href="/login" className="home-btn home-btn-primary">
            <span className="home-btn-icon">🚀</span>
            Login to Continue
          </Link>
          <Link href="/help" className="home-btn home-btn-outline">
            <span className="home-btn-icon">❓</span>
            Help &amp; Support
          </Link>
        </div>

        {/* Stats row */}
        <div className="home-stats">
          <div className="home-stat">
            <div className="home-stat-value">99.9%</div>
            <div className="home-stat-label">Uptime</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">256-bit</div>
            <div className="home-stat-label">Encryption</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">24/7</div>
            <div className="home-stat-label">Support</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">∞</div>
            <div className="home-stat-label">Exams</div>
          </div>
        </div>
      </div>
    </div>
  );
}
