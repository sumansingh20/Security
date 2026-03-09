'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      toast.success('Password reset email sent');
    } catch (error: any) {
      // Show success even on error to prevent email enumeration
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: '#ffffff' }}>
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
              lineHeight: 1,
              flexShrink: 0,
            }}>
              PE
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', lineHeight: 1.2 }}>ProctoredExam</div>
              <div style={{ fontSize: '11px', opacity: 0.75, lineHeight: 1.2 }}>Secure Examination Portal</div>
            </div>
          </Link>
          <Link href="/login" style={{ color: '#bee3f8', fontSize: '13px', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>

          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>

            {/* Card Header */}
            <div style={{ padding: '24px 32px 0 32px', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#212529' }}>
                Forgotten Password
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6c757d' }}>
                {submitted
                  ? 'Check your email for reset instructions'
                  : 'Enter your email address to reset your password'}
              </p>
            </div>

            {/* Form Area */}
            <div style={{ padding: '24px 32px 32px 32px' }}>
              {submitted ? (
                <div>
                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '4px',
                    color: '#155724',
                    fontSize: '13px',
                    lineHeight: 1.6,
                  }}>
                    If an account exists with the email address you entered, you will receive
                    an email with instructions on how to reset your password.
                  </div>
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    backgroundColor: '#e8f4fd',
                    border: '1px solid #b8daff',
                    borderRadius: '4px',
                    color: '#004085',
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}>
                    If you do not receive an email within a few minutes, please check your
                    spam folder or try again.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      htmlFor="email"
                      style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#495057' }}
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email address"
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
                        boxSizing: 'border-box' as const,
                        outline: 'none',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#1d4f91'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(29,79,145,0.15)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#ced4da'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#868e96' }}>
                      Enter the email address associated with your account
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
                    {isSubmitting ? 'Sending...' : 'Reset Password'}
                  </button>
                </form>
              )}
            </div>

            {/* Card Footer */}
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
              <Link href="/login" style={{ color: '#1d4f91', textDecoration: 'none' }}>
                Return to Sign In
              </Link>
              <span style={{ color: '#ced4da' }}>|</span>
              <Link href="/help" style={{ color: '#1d4f91', textDecoration: 'none' }}>
                Help
              </Link>
              <span style={{ color: '#ced4da' }}>|</span>
              <Link href="/" style={{ color: '#1d4f91', textDecoration: 'none' }}>
                Home
              </Link>
            </div>
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
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#adb5bd' }}>
          For technical support, contact: support@proctoredexam.com
        </p>
      </footer>
    </div>
  );
}
