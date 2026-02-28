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
      <div className="landing">
        <div className="landing-loader">
          <div className="landing-logo">PE</div>
          <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#3b82f6' }}></div>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const dashboardUrl = user.role === 'admin' ? '/admin/dashboard' : user.role === 'teacher' ? '/teacher' : '/my';
    return (
      <div className="landing">
        <div className="landing-welcome">
          <div className="landing-logo">PE</div>
          <h1 className="landing-welcome-title">Welcome back, {user.firstName}</h1>
          <p className="landing-welcome-sub">Signed in as <strong>{user.role}</strong></p>
          <Link href={dashboardUrl} className="landing-cta">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <div className="landing-logo">PE</div>
            <span className="landing-brand-text">ProctoredExam</span>
          </div>
          <div className="landing-nav-links">
            <Link href="/help" className="landing-nav-link">Help</Link>
            <Link href="/login" className="landing-cta-sm">Sign In</Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <h1 className="landing-title">Secure Online<br />Examination Portal</h1>
        <p className="landing-desc">
          Conduct proctored assessments with browser lockdown, webcam monitoring, and real-time violation tracking.
          Built for institutions that require verified, tamper-proof examinations.
        </p>
        <div className="landing-hero-actions">
          <Link href="/login" className="landing-cta">Sign In to Continue</Link>
          <Link href="/help" className="landing-cta-outline">View Documentation</Link>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-num">01</div>
            <h3 className="landing-feature-title">Browser Lockdown</h3>
            <p className="landing-feature-desc">
              Full-screen enforcement prevents tab switching, copy-paste,
              and access to external applications during exams.
            </p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-num">02</div>
            <h3 className="landing-feature-title">Live Monitoring</h3>
            <p className="landing-feature-desc">
              Webcam and microphone feeds monitored in real-time.
              Automatic flagging of suspicious behavior and face detection.
            </p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-num">03</div>
            <h3 className="landing-feature-title">Batch Scheduling</h3>
            <p className="landing-feature-desc">
              Schedule exams across multiple batches with staggered timing.
              Up to 500 students per batch with automatic transitions.
            </p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-num">04</div>
            <h3 className="landing-feature-title">Question Bank</h3>
            <p className="landing-feature-desc">
              Create MCQ, multi-select, true/false, short answer, and essay questions.
              Randomization and section-based paper generation.
            </p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-num">05</div>
            <h3 className="landing-feature-title">Auto Grading</h3>
            <p className="landing-feature-desc">
              Objective answers graded instantly on submission.
              Negative marking, partial scoring, and detailed result breakdowns.
            </p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-num">06</div>
            <h3 className="landing-feature-title">Audit Trail</h3>
            <p className="landing-feature-desc">
              Complete log of every action: login attempts, answer changes,
              violations, and submission timestamps for compliance.
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>ProctoredExam &middot; Secure Examination System</p>
      </footer>
    </div>
  );
}
