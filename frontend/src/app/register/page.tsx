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
    return <div className="page-loading">Loading...</div>;
  }

  if (user) {
    return <div className="page-loading">Redirecting...</div>;
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <Link href="/" className="public-logo">
            <span className="public-logo-icon">PE</span>
            <span className="public-logo-text">ProctoredExam</span>
          </Link>
          <nav className="public-nav">
            <Link href="/">Home</Link>
            <Link href="/login" className="public-nav-login">Log in</Link>
          </nav>
        </div>
      </header>

      <div className="public-breadcrumb">
        <Link href="/">Home</Link> &gt; Create new account
      </div>

      <main className="public-main">
        <div className="login-wrapper">
          <div className="login-card">
            <h1>Create new account</h1>
            
            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="login-field">
                  <label htmlFor="firstName">First name</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="login-field">
                  <label htmlFor="lastName">Last name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
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
                  required
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  Password must contain:
                  <ul style={{ paddingLeft: '16px', margin: '4px 0 0' }}>
                    {passwordRequirements.map((req, index) => (
                      <li key={index} style={{ color: req.test(formData.password) ? '#5cb85c' : '#666' }}>
                        {req.test(formData.password) ? '✓' : '○'} {req.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p style={{ color: '#a94442', fontSize: '12px', marginTop: '4px' }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              <button type="submit" className="login-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create my new account'}
              </button>
            </form>

            <div className="login-links">
              <Link href="/login">Already have an account? Log in</Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="public-footer">
        <div className="public-footer-content">
          <div className="public-footer-info">
            <p>ProctoredExam © 2024</p>
          </div>
          <div className="public-footer-links">
            <span className="text-gray-400 text-sm">ProctoredExam - Secure Exam Portal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
