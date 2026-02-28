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
      <div className="auth-status-page">
        <div className="spinner" />
        <p className="auth-status-desc">Loading...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-status-page">
        <p className="auth-status-desc">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="login-header-inner">
          <Link href="/" className="login-header-home">
            <div className="login-logo">
              <span className="login-logo-text">PE</span>
            </div>
            <div className="login-institute">
              <div className="login-institute-name">ProctoredExam</div>
              <div className="login-institute-sub">Create Account</div>
            </div>
          </Link>
        </div>
      </header>

      <main className="login-main">
        <div className="login-container" style={{ maxWidth: '500px' }}>
          <div className="login-box">
            <div className="login-box-header">
              <div className="login-box-title">Create New Account</div>
              <div className="login-box-subtitle">Fill in your details to register</div>
            </div>

            <div className="login-box-body">
              {error && (
                <div className="login-error">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="login-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="login-field">
                    <label htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      required
                    />
                  </div>
                  <div className="login-field">
                    <label htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="studentId">Student ID (optional)</label>
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    value={formData.studentId}
                    onChange={handleChange}
                    placeholder="e.g., 21BCS001"
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                  />
                  <div className="login-field-hint" style={{ marginTop: '8px' }}>
                    <ul style={{ paddingLeft: '16px', margin: '4px 0 0', listStyle: 'none' }}>
                      {passwordRequirements.map((req, index) => (
                        <li key={index} style={{ color: req.test(formData.password) ? '#4ade80' : 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>
                          {req.test(formData.password) ? '\u2713' : '\u2022'} {req.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    required
                    autoComplete="new-password"
                  />
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <div className="login-field-hint" style={{ color: '#fca5a5', marginTop: '4px' }}>
                      Passwords do not match
                    </div>
                  )}
                </div>

                <button type="submit" className="login-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <div className="login-notice" style={{ marginTop: '20px', textAlign: 'center' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: '#60a5fa', fontWeight: 600 }}>
                  Log in here
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="login-footer">
        <p>&copy; 2026 ProctoredExam. All rights reserved.</p>
      </footer>
    </div>
  );
}
