'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && user) {
      router.replace(user.role === 'admin' ? '/admin/dashboard' : '/my');
    }
  }, [mounted, isLoading, user, router]);

  const passwordRequirements = [
    { test: (p: string) => p.length >= 8, text: 'At least 8 characters' },
    { test: (p: string) => /[A-Z]/.test(p), text: 'One uppercase letter' },
    { test: (p: string) => /[a-z]/.test(p), text: 'One lowercase letter' },
    { test: (p: string) => /[0-9]/.test(p), text: 'One number' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const failedRequirements = passwordRequirements.filter(
      (req) => !req.test(formData.password)
    );
    if (failedRequirements.length > 0) {
      setError('Password does not meet all requirements');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        studentId: formData.studentId || undefined,
      });
      if (!result.success) {
        setError(result.error || 'Registration failed');
        return;
      }
      toast.success('Registration successful. Please log in.');
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>Redirecting...</p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    fontSize: '14px',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    color: '#212529',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#495057',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#1d4f91';
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(29,79,145,0.15)';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#ced4da';
    e.currentTarget.style.boxShadow = 'none';
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
              <div style={{ fontSize: '11px', opacity: 0.75, lineHeight: 1.2 }}>Create Account</div>
            </div>
          </Link>
          <Link href="/login" style={{ color: '#bee3f8', fontSize: '13px', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>

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
                Create New Account
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6c757d' }}>
                Fill in your details to register
              </p>
            </div>

            {/* Form Area */}
            <div style={{ padding: '24px 32px 32px 32px' }}>

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
                  <strong>Error:</strong> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="email" style={labelStyle}>Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@institution.edu"
                    required
                    autoComplete="email"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label htmlFor="firstName" style={labelStyle}>First Name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      required
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" style={labelStyle}>Last Name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      required
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="studentId" style={labelStyle}>Student ID (optional)</label>
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    value={formData.studentId}
                    onChange={handleChange}
                    placeholder="e.g., 21BCS001"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="password" style={labelStyle}>Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <ul style={{ paddingLeft: '16px', margin: '8px 0 0', listStyle: 'none', fontSize: '12px' }}>
                    {passwordRequirements.map((req, index) => (
                      <li key={index} style={{ color: req.test(formData.password) ? '#16a34a' : '#adb5bd', marginBottom: '2px' }}>
                        {req.test(formData.password) ? '\u2713' : '\u2022'} {req.text}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    required
                    autoComplete="new-password"
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#dc3545' }}>
                      Passwords do not match
                    </p>
                  )}
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
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#6c757d' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: '#1d4f91', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in here
                </Link>
              </p>
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
              <Link href="/login" style={{ color: '#1d4f91', textDecoration: 'none' }}>Sign In</Link>
              <span style={{ color: '#ced4da' }}>|</span>
              <Link href="/help" style={{ color: '#1d4f91', textDecoration: 'none' }}>Help</Link>
              <span style={{ color: '#ced4da' }}>|</span>
              <Link href="/" style={{ color: '#1d4f91', textDecoration: 'none' }}>Home</Link>
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
      </footer>
    </div>
  );
}
