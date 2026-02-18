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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#1d4f91] text-white text-xs">
        <div className="max-w-5xl mx-auto px-4 py-1 flex justify-between">
          <span>ProctoredExam - Secure Exam Portal</span>
          <span>You are not logged in. (<Link href="/login" className="hover:underline">Log in</Link>)</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-300">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1d4f91] rounded flex items-center justify-center text-white font-bold text-sm">
              PE
            </div>
            <span className="text-lg font-semibold text-gray-900">ProctoredExam</span>
          </Link>
          <nav className="text-sm">
            <Link href="/" className="text-[#0066cc] hover:underline mr-4">Home</Link>
            <Link href="/login" className="text-[#0066cc] hover:underline">Log in</Link>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-2 text-sm text-gray-600">
          <Link href="/" className="text-[#0066cc] hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <span>Forgot password</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white border border-gray-300 rounded">
            <div className="bg-gray-50 border-b border-gray-300 px-4 py-3">
              <h1 className="text-base font-semibold text-gray-800">Forgotten password</h1>
            </div>
            
            <div className="p-4">
              {submitted ? (
                <div>
                  <p className="text-sm text-gray-700 mb-4">
                    If an account exists with the email address you entered, you will receive 
                    an email with instructions on how to reset your password.
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    If you do not receive an email within a few minutes, please check your 
                    spam folder or try again.
                  </p>
                  <Link href="/login" className="text-[#0066cc] hover:underline text-sm">
                    Return to login
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    To reset your password, enter your email address below. If we find a 
                    matching account, you will receive an email with instructions to reset 
                    your password.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1d4f91] focus:border-[#1d4f91]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2 px-4 bg-[#1d4f91] text-white text-sm font-medium rounded hover:bg-[#163d70] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Sending...' : 'Search'}
                    </button>
                  </form>

                  <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                    <p>
                      <Link href="/login" className="text-[#0066cc] hover:underline">
                        Return to login
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-300 py-3">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-gray-500">
          ProctorExam &copy; 2026. Secure Examination Portal.
        </div>
      </footer>
    </div>
  );
}
