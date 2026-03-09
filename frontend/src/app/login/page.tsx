'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

type LoginMode = 'staff' | 'student';

export default function LoginPage() {
  const { login, dobLogin } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [serverTime, setServerTime] = useState('');
  const [loginMode, setLoginMode] = useState<LoginMode>('student');
  const [showPassword, setShowPassword] = useState(false);

  const [staffForm, setStaffForm] = useState({ email: '', password: '' });
  const [studentForm, setStudentForm] = useState({ studentId: '', dob: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { setMounted(true); }, []);

  const fetchServerTime = useCallback(async () => {
    try {
      const response = await api.get('/auth/server-time');
      const data = response.data.data || response.data;
      if (data.serverTime) {
        const serverDate = new Date(data.serverTime);
        setServerTime(serverDate.toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }));
      }
    } catch {
      setServerTime(new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
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

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const result = await login(staffForm.email, staffForm.password);
      if (result.success && result.user) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          if (result.user!.role === 'admin') window.location.href = '/admin/dashboard';
          else if (result.user!.role === 'teacher') window.location.href = '/teacher';
          else window.location.href = '/my';
        }, 500);
      } else {
        setError(result.error || 'Authentication failed. Please check your credentials.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setIsSubmitting(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const dobClean = studentForm.dob.replace(/[^0-9]/g, '');
    if (dobClean.length !== 8) {
      setError('Please enter DOB in DDMMYYYY format (e.g., 01012000 for 01-Jan-2000)');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await dobLogin(studentForm.studentId, dobClean);
      if (result.success && result.user) {
        setSuccess('Login successful! Redirecting to your dashboard...');
        setTimeout(() => { window.location.href = '/my'; }, 500);
      } else {
        setError(result.error || 'Authentication failed. Please check your Student ID and Date of Birth.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>

      {/* Top Bar */}
      <header style={{ backgroundColor: '#1d4f91', color: '#ffffff' }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* PE logo mark */}
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
              color: '#1d4f91',
              letterSpacing: '-0.5px',
              lineHeight: 1,
              flexShrink: 0,
            }}>
              PE
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', lineHeight: 1.2 }}>ProctoredExam</div>
              <div style={{ fontSize: '11px', opacity: 0.75, lineHeight: 1.2 }}>Secure Examination Portal</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, fontFamily: 'monospace' }}>
            {serverTime || ''}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>

          {/* Login Card */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>

            {/* Card Header */}
            <div style={{
              padding: '24px 32px 0 32px',
              textAlign: 'center',
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#212529' }}>
                Sign In
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6c757d' }}>
                Access the examination portal
              </p>
            </div>

            {/* Tab Switcher */}
            <div style={{
              display: 'flex',
              margin: '20px 32px 0 32px',
              borderBottom: '2px solid #e9ecef',
            }}>
              <button
                type="button"
                onClick={() => { setLoginMode('student'); setError(''); setSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: '14px',
                  fontWeight: loginMode === 'student' ? 600 : 400,
                  color: loginMode === 'student' ? '#1d4f91' : '#6c757d',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: loginMode === 'student' ? '2px solid #1d4f91' : '2px solid transparent',
                  marginBottom: '-2px',
                  cursor: 'pointer',
                }}
              >
                Student Login
              </button>
              <button
                type="button"
                onClick={() => { setLoginMode('staff'); setError(''); setSuccess(''); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: '14px',
                  fontWeight: loginMode === 'staff' ? 600 : 400,
                  color: loginMode === 'staff' ? '#1d4f91' : '#6c757d',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: loginMode === 'staff' ? '2px solid #1d4f91' : '2px solid transparent',
                  marginBottom: '-2px',
                  cursor: 'pointer',
                }}
              >
                Staff / Admin
              </button>
            </div>

            {/* Form Area */}
            <div style={{ padding: '24px 32px 32px 32px' }}>

              {/* Success Message */}
              {success && (
                <div style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '4px',
                  color: '#155724',
                  fontSize: '13px',
                }}>
                  {success}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div style={{
                  marginBottom: '16px',
                  padding: '10px 14px',
                  backgroundColor: '#f8d7da',
                  border: '1px solid #f5c6cb',
                  borderRadius: '4px',
                  color: '#721c24',
                  fontSize: '13px',
                }}>
                  {error}
                </div>
              )}

              {/* Student Login Form */}
              {loginMode === 'student' && (
                <form onSubmit={handleStudentSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      htmlFor="studentId"
                      style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#495057' }}
                    >
                      Student ID / Roll Number
                    </label>
                    <input
                      id="studentId"
                      type="text"
                      value={studentForm.studentId}
                      onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                      placeholder="e.g., STU001"
                      required
                      autoComplete="username"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '14px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#212529',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1d4f91'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(29,79,145,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#ced4da'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#868e96' }}>
                      Enter the Student ID provided by your institution
                    </p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label
                      htmlFor="dob"
                      style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#495057' }}
                    >
                      Date of Birth
                    </label>
                    <input
                      id="dob"
                      type="text"
                      value={studentForm.dob}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        setStudentForm({ ...studentForm, dob: val });
                      }}
                      placeholder="DDMMYYYY"
                      required
                      maxLength={8}
                      autoComplete="bday"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        letterSpacing: '1px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#212529',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1d4f91'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(29,79,145,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#ced4da'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#868e96' }}>
                      Format: DDMMYYYY &mdash; Example: 01-Jan-2000 &rarr;{' '}
                      <span style={{ fontFamily: 'monospace', color: '#495057' }}>01012000</span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#ffffff',
                      backgroundColor: isSubmitting ? '#6c8ebf' : '#1d4f91',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              )}

              {/* Staff Login Form */}
              {loginMode === 'staff' && (
                <form onSubmit={handleStaffSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      htmlFor="email"
                      style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#495057' }}
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      placeholder="you@institution.edu"
                      required
                      autoComplete="email"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '14px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#212529',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1d4f91'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(29,79,145,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#ced4da'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label
                      htmlFor="password"
                      style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#495057' }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={staffForm.password}
                        onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                        style={{
                          width: '100%',
                          padding: '9px 40px 9px 12px',
                          fontSize: '14px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#212529',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#1d4f91'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(29,79,145,0.15)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#ced4da'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#6c757d',
                          padding: '4px 6px',
                          borderRadius: '3px',
                        }}
                        tabIndex={-1}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#ffffff',
                      backgroundColor: isSubmitting ? '#6c8ebf' : '#1d4f91',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              )}

              {/* Security Notice */}
              <div style={{
                marginTop: '20px',
                padding: '10px 14px',
                backgroundColor: '#e8f4fd',
                border: '1px solid #b8daff',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#004085',
                lineHeight: 1.5,
              }}>
                <strong>Notice:</strong>{' '}
                {loginMode === 'student'
                  ? 'Login is enabled during scheduled examination windows. Unauthorized access attempts are logged.'
                  : 'This is a secured system. All activities are logged and monitored.'}
              </div>
            </div>

            {/* Card Footer Links */}
            <div style={{
              padding: '14px 32px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
            }}>
              <Link href="/forgot-password" style={{ color: '#1d4f91', textDecoration: 'none' }}>
                Forgot Password?
              </Link>
              <span style={{ color: '#ced4da' }}>|</span>
              <Link href="/help" style={{ color: '#1d4f91', textDecoration: 'none' }}>
                Help
              </Link>
              <span style={{ color: '#ced4da' }}>|</span>
              <Link href="/register" style={{ color: '#1d4f91', textDecoration: 'none' }}>
                Register
              </Link>
            </div>
          </div>

          {/* Mobile server time */}
          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', color: '#868e96', fontFamily: 'monospace' }}>
            {serverTime || ''}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #dee2e6',
        padding: '16px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#868e96' }}>
          &copy; 2026 ProctoredExam &middot; Secure Online Examination System
        </p>
      </footer>
    </div>
  );
}
