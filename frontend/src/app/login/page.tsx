'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type LoginMode = 'staff' | 'student';

/**
 * LOGIN PAGE - CRASH-PROOF DESIGN
 * 
 * NO useEffect redirects
 * NO auto-reload
 * NO auth checking loops
 * 
 * Simple flow:
 * 1. User submits form
 * 2. Backend validates and sets cookie
 * 3. On success, window.location navigates (full reload)
 */
export default function LoginPage() {
  const { login, dobLogin, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [serverTime, setServerTime] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('student');

  // Staff login form
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
  });

  // Student DOB login form
  const [studentForm, setStudentForm] = useState({
    studentId: '',
    dob: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Set mounted on client only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch server time - no auth check here
  const fetchServerTime = useCallback(async () => {
    try {
      const response = await api.get('/auth/server-time');
      const data = response.data.data || response.data;
      if (data.serverTime) {
        const serverDate = new Date(data.serverTime);
        setServerTime(serverDate.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }));
      }
    } catch (err) {
      // Fallback to local time
      const now = new Date();
      setServerTime(now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchServerTime();
      const timer = setInterval(fetchServerTime, 30000);
      return () => clearInterval(timer);
    }
  }, [mounted, fetchServerTime]);

  // NO useEffect for redirect - removed to prevent loops

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(staffForm.email, staffForm.password);
      
      if (result.success && result.user) {
        // CRITICAL: Use window.location for full page navigation
        // This ensures session cookie is properly sent on next request
        if (result.user.role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else if (result.user.role === 'teacher') {
          window.location.href = '/teacher';
        } else {
          window.location.href = '/my';
        }
      } else {
        setError(result.error || 'Authentication failed');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate DOB format
    const dobClean = studentForm.dob.replace(/[^0-9]/g, '');
    if (dobClean.length !== 8) {
      setError('Please enter DOB in DDMMYYYY format (e.g., 15061995 for 15-June-1995)');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await dobLogin(studentForm.studentId, dobClean);
      
      if (result.success && result.user) {
        // CRITICAL: Use window.location for full page navigation
        window.location.href = '/my';
      } else {
        setError(result.error || 'Authentication failed');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  // Show loading while mounting
  if (!mounted) {
    return (
      <div className="lms-loading-page">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Institutional Header */}
      <header className="login-header">
        <div className="login-header-inner">
          <div className="login-logo">
            <span className="login-logo-text">PE</span>
          </div>
          <div className="login-institute">
            <div className="login-institute-name">ProctoredExam</div>
            <div className="login-institute-sub">Secure Exam Portal</div>
          </div>
        </div>
      </header>

      {/* Main Login Form */}
      <main className="login-main">
        <div className="login-container">
          <div className="login-box">
            {/* Login Mode Tabs */}
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${loginMode === 'student' ? 'active' : ''}`}
                onClick={() => { setLoginMode('student'); setError(''); }}
              >
                Student Login
              </button>
              <button
                type="button"
                className={`login-tab ${loginMode === 'staff' ? 'active' : ''}`}
                onClick={() => { setLoginMode('staff'); setError(''); }}
              >
                Staff Login
              </button>
            </div>

            <div className="login-box-header">
              <div className="login-box-title">
                {loginMode === 'student' ? 'Student Examination Login' : 'Staff / Admin Login'}
              </div>
              <div className="login-box-subtitle">
                {loginMode === 'student' 
                  ? 'Enter your Student ID and Date of Birth' 
                  : 'Enter your credentials to access the system'}
              </div>
            </div>

            <div className="login-box-body">
              {error && (
                <div className="login-error">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Student DOB Login Form */}
              {loginMode === 'student' && (
                <form onSubmit={handleStudentSubmit}>
                  <div className="login-field">
                    <label htmlFor="studentId">Student ID / Roll Number</label>
                    <input
                      id="studentId"
                      type="text"
                      value={studentForm.studentId}
                      onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                      placeholder="e.g., 21BCS001 or REG123456"
                      required
                      autoComplete="username"
                    />
                    <div className="login-field-hint">
                      Enter the Student ID or Roll Number provided by your institution
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="dob">Date of Birth</label>
                    <input
                      id="dob"
                      type="text"
                      value={studentForm.dob}
                      onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                      placeholder="DDMMYYYY (e.g., 15061995)"
                      required
                      maxLength={8}
                      autoComplete="bday"
                    />
                    <div className="login-field-hint">
                      Format: Day (2 digits) + Month (2 digits) + Year (4 digits)<br/>
                      Example: 15-June-1995 → <strong>15061995</strong>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Authenticating...' : 'Login to Exam Portal'}
                  </button>
                </form>
              )}

              {/* Staff Email/Password Login Form */}
              {loginMode === 'staff' && (
                <form onSubmit={handleStaffSubmit}>
                  <div className="login-field">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      placeholder="Enter your email address"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="login-field">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      value={staffForm.password}
                      onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    className="login-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Authenticating...' : 'Login'}
                  </button>
                </form>
              )}

              <div className="login-notice">
                <strong>Important:</strong>
                {loginMode === 'student' ? (
                  <>
                    {' '}Login is enabled only during scheduled examination windows. 
                    Do not share your credentials with anyone. 
                    Unauthorized access attempts are logged and may result in disciplinary action.
                  </>
                ) : (
                  <>
                    {' '}This is a secure system. All activities are logged and monitored.
                  </>
                )}
              </div>
            </div>

            <div className="login-box-footer">
              <span className="text-gray-500 text-xs">
                For help, contact your exam administrator.
              </span>
            </div>
          </div>

          <div className="login-notice" style={{ marginTop: '16px', textAlign: 'center' }}>
            Server Time: <strong className="font-mono">{serverTime}</strong>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <p>© 2026 ProctoredExam. All rights reserved.</p>
        <p style={{ marginTop: '4px' }}>
          For technical support, contact: support@proctoredexam.com | +91-XXX-XXXXXXX
        </p>
      </footer>

      <style jsx>{`
        .login-tabs {
          display: flex;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 0;
        }
        .login-tab {
          flex: 1;
          padding: 12px 16px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
        }
        .login-tab:hover {
          color: #3b82f6;
          background: #f8fafc;
        }
        .login-tab.active {
          color: #1e40af;
          border-bottom-color: #1e40af;
          background: #eff6ff;
        }
      `}</style>
    </div>
  );
}
