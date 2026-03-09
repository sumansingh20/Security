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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', borderColor: '#dee2e6', borderTopColor: '#1d4f91' }} />
          <p style={{ color: '#6c757d', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const dashboardUrl = user.role === 'admin' ? '/admin/dashboard' : user.role === 'teacher' ? '/teacher' : '/my';
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
        {/* Header */}
        <header style={{ background: '#1d4f91', color: '#fff', padding: '8px 0', fontSize: 12 }}>
          <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
            <span>Logged in as <strong>{user.firstName} {user.lastName}</strong></span>
            <Link href={dashboardUrl} style={{ color: '#bee3f8', textDecoration: 'underline' }}>My Dashboard</Link>
          </div>
        </header>
        <div style={{ background: '#fff', borderBottom: '1px solid #dee2e6', padding: '12px 0' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: '#1d4f91', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>PE</div>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a' }}>ProctoredExam</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Welcome back, {user.firstName}</h1>
            <p style={{ color: '#6c757d', fontSize: 14, marginBottom: 24 }}>You are signed in as <strong style={{ textTransform: 'capitalize' }}>{user.role}</strong>.</p>
            <Link href={dashboardUrl} style={{ display: 'inline-block', padding: '10px 32px', background: '#1d4f91', color: '#fff', fontSize: 14, fontWeight: 500, borderRadius: 4, textDecoration: 'none' }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
        <footer style={{ textAlign: 'center', padding: '16px 20px', fontSize: 12, color: '#6c757d', borderTop: '1px solid #dee2e6' }}>
          ProctoredExam - Secure Examination Portal
        </footer>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8f9fa', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Top utility bar */}
      <div style={{ background: '#1d4f91', color: '#fff', fontSize: 12, padding: '6px 0' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ opacity: 0.85 }}>Secure Online Examination Portal</span>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/help" style={{ color: '#bee3f8', textDecoration: 'none', fontSize: 12 }}>Help</Link>
            <Link href="/login" style={{ color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 500 }}>Sign In</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #dee2e6', padding: '14px 0' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, background: '#1d4f91', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>PE</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>ProctoredExam</div>
              <div style={{ fontSize: 11, color: '#6c757d', lineHeight: 1.2 }}>Examination Management System</div>
            </div>
          </Link>
          <nav style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Link href="/login" style={{ padding: '8px 20px', background: '#1d4f91', color: '#fff', fontSize: 13, fontWeight: 500, borderRadius: 4, textDecoration: 'none', border: 'none' }}>
              Sign In
            </Link>
            <Link href="/register" style={{ padding: '8px 20px', background: '#fff', color: '#1d4f91', fontSize: 13, fontWeight: 500, borderRadius: 4, textDecoration: 'none', border: '1px solid #1d4f91' }}>
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 0 }}>
          {[
            { label: 'Home', href: '/', active: true },
            { label: 'Exam Portal', href: '/exam/login' },
            { label: 'Student Login', href: '/login' },
            { label: 'Help & Documentation', href: '/help' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                color: item.active ? '#1d4f91' : '#495057',
                textDecoration: 'none',
                borderBottom: item.active ? '2px solid #1d4f91' : '2px solid transparent',
                fontWeight: item.active ? 600 : 400,
                marginBottom: -1,
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ background: 'linear-gradient(135deg, #1d4f91 0%, #2c5282 50%, #1e3a5f 100%)', color: '#fff', padding: '48px 0' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ maxWidth: 720 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3, margin: '0 0 16px' }}>
              Secure Online Examination Portal
            </h1>
            <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.9, margin: '0 0 24px', maxWidth: 560 }}>
              Conduct proctored assessments with browser lockdown, webcam monitoring, and real-time
              violation tracking. Designed for educational institutions that require verified, tamper-proof examinations.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/login" style={{ padding: '10px 28px', background: '#fff', color: '#1d4f91', fontSize: 14, fontWeight: 600, borderRadius: 4, textDecoration: 'none' }}>
                Sign In
              </Link>
              <Link href="/exam/login" style={{ padding: '10px 28px', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, fontWeight: 500, borderRadius: 4, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
                Take an Exam
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
            {/* Left content */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #dee2e6' }}>
                About This Portal
              </h2>
              <p style={{ fontSize: 14, color: '#495057', lineHeight: 1.75, marginBottom: 20 }}>
                ProctoredExam is a secure, proctored online examination system built for educational institutions.
                It provides a tamper-proof environment for conducting assessments, with comprehensive monitoring,
                violation detection, and automated grading capabilities.
              </p>

              {/* Feature Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                {[
                  { title: 'Browser Lockdown', desc: 'Full-screen enforcement prevents tab switching, copy-paste, and external applications.' },
                  { title: 'Live Proctoring', desc: 'Webcam and microphone monitoring with automatic flagging of suspicious behavior.' },
                  { title: 'Batch Scheduling', desc: 'Schedule exams across batches with staggered timing for up to 500 students.' },
                  { title: 'Question Bank', desc: 'MCQ, multi-select, true/false, short answer, essay, matching, and code questions.' },
                  { title: 'Auto Grading', desc: 'Instant grading on submission with negative marking and detailed breakdowns.' },
                  { title: 'Audit Trail', desc: 'Complete log of login attempts, answer changes, violations, and timestamps.' },
                ].map((f) => (
                  <div key={f.title} style={{ padding: '16px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>{f.title}</h3>
                    <p style={{ fontSize: 13, color: '#6c757d', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                  </div>
                ))}
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #dee2e6' }}>
                Getting Started
              </h2>

              <div style={{ fontSize: 14, color: '#495057', lineHeight: 1.75 }}>
                <p style={{ marginBottom: 14 }}>
                  <strong>For Students:</strong> Log in with your institutional credentials to access scheduled exams,
                  take proctored assessments, and view your results and performance reports.
                </p>
                <p style={{ marginBottom: 14 }}>
                  <strong>For Teachers:</strong> Create and manage exams, build question banks, monitor live exam sessions,
                  and view detailed analytics and violation reports.
                </p>
                <p style={{ marginBottom: 14 }}>
                  <strong>For Administrators:</strong> Manage users, configure system settings, schedule exam batches,
                  access audit logs, and generate institution-wide reports.
                </p>
                <p>
                  New users should contact their institution&apos;s administrator for account credentials.
                  If you already have an account, <Link href="/login" style={{ color: '#1d4f91', textDecoration: 'underline' }}>sign in here</Link>.
                </p>
              </div>
            </div>

            {/* Right sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Login Card */}
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '10px 16px', borderBottom: '1px solid #dee2e6' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Quick Access</h3>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link href="/login" style={{ display: 'block', padding: '9px 16px', background: '#1d4f91', color: '#fff', fontSize: 13, fontWeight: 500, borderRadius: 4, textDecoration: 'none', textAlign: 'center' }}>
                    Staff / Student Login
                  </Link>
                  <Link href="/exam/login" style={{ display: 'block', padding: '9px 16px', background: '#f8f9fa', color: '#1d4f91', fontSize: 13, fontWeight: 500, borderRadius: 4, textDecoration: 'none', textAlign: 'center', border: '1px solid #dee2e6' }}>
                    Direct Exam Login
                  </Link>
                </div>
              </div>

              {/* System Info */}
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '10px 16px', borderBottom: '1px solid #dee2e6' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Platform Information</h3>
                </div>
                <div style={{ padding: 16 }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['Version', 'v2.4.1'],
                        ['Server Status', 'Online'],
                        ['Exam Engine', 'Active'],
                        ['Proctoring', 'Enabled'],
                        ['Max Batch Size', '500 students'],
                      ].map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '7px 0', color: '#6c757d' }}>{k}</td>
                          <td style={{ padding: '7px 0', color: v === 'Online' || v === 'Active' || v === 'Enabled' ? '#16a34a' : '#1a1a1a', fontWeight: 500, textAlign: 'right' }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Security Features */}
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '10px 16px', borderBottom: '1px solid #dee2e6' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Security Features</h3>
                </div>
                <div style={{ padding: 16 }}>
                  <ul style={{ fontSize: 13, color: '#495057', lineHeight: 2, margin: 0, paddingLeft: 18 }}>
                    <li>Browser lockdown enforcement</li>
                    <li>Webcam identity verification</li>
                    <li>IP and device fingerprinting</li>
                    <li>Real-time violation detection</li>
                    <li>Encrypted session management</li>
                    <li>Complete audit trail logging</li>
                  </ul>
                </div>
              </div>

              {/* Support */}
              <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '10px 16px', borderBottom: '1px solid #dee2e6' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Support</h3>
                </div>
                <div style={{ padding: 16, fontSize: 13, color: '#495057', lineHeight: 1.8 }}>
                  <p style={{ margin: 0 }}>For technical assistance, contact your institution&apos;s IT department or visit the <Link href="/help" style={{ color: '#1d4f91', textDecoration: 'underline' }}>help center</Link>.</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: '#fff', borderTop: '1px solid #dee2e6', padding: '20px 0' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13, color: '#6c757d' }}>
              <Link href="/" style={{ color: '#6c757d', textDecoration: 'none' }}>Home</Link>
              <Link href="/help" style={{ color: '#6c757d', textDecoration: 'none' }}>Help</Link>
              <Link href="/login" style={{ color: '#6c757d', textDecoration: 'none' }}>Sign In</Link>
            </div>
            <div style={{ fontSize: 12, color: '#adb5bd' }}>
              &copy; {new Date().getFullYear()} ProctoredExam. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
