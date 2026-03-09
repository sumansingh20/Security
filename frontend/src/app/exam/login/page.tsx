'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export default function ExamLoginPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState(''); // DOB as password
  const [examCode, setExamCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [examDetails, setExamDetails] = useState<{
    examId: string;
    title: string;
    duration: number;
    totalQuestions: number;
    sessionToken: string;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get browser fingerprint
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprint = result.visitorId;

      const response = await fetch(`${API_URL}/exam-engine/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-browser-fingerprint': fingerprint,
        },
        body: JSON.stringify({
          examId: examCode,
          userId,
          password,
          fingerprint,
        }),
      });

      if (!response.ok && response.status >= 500) {
        setError('Server error. Please try again later.');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        if (data.reason === 'exam_not_started') {
          const mins = Math.floor(data.startsIn / 60);
          const secs = data.startsIn % 60;
          setError(`Exam has not started yet. Starts in ${mins}m ${secs}s`);
        } else if (data.reason === 'exam_ended') {
          setError('This exam has ended.');
        } else if (data.reason === 'batch_not_active') {
          setError(data.message || 'Your batch is not active yet. Please wait.');
        } else if (data.reason === 'not_enrolled') {
          setError('You are not enrolled in this exam.');
        } else if (data.reason === 'session_exists') {
          const resolvedExamId = data.examId || examCode;
          sessionStorage.setItem(`exam_session_${resolvedExamId}`, data.sessionToken);
          router.push(`/exam/${resolvedExamId}/attempt`);
          return;
        } else {
          setError(data.message || 'Login failed. Please check your credentials.');
        }
        setLoading(false);
        return;
      }

      const resolvedExamId = data.examId || examCode;
      sessionStorage.setItem(`exam_session_${resolvedExamId}`, data.sessionToken);

      setExamDetails({
        examId: data.examId,
        title: data.title || 'Examination',
        duration: data.duration,
        totalQuestions: data.totalQuestions,
        sessionToken: data.sessionToken,
      });
      setShowInstructions(true);
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection failed. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const startExam = () => {
    if (examDetails) {
      router.push(`/exam/${examDetails.examId}/attempt`);
    }
  };

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

  // Instructions screen
  if (showInstructions && examDetails) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
        <header style={{ backgroundColor: '#1d4f91', color: '#ffffff' }}>
          <div style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            height: '56px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              }}>
                PE
              </div>
              <span style={{ fontWeight: 700, fontSize: '16px' }}>ProctoredExam</span>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            maxWidth: '640px',
            width: '100%',
            overflow: 'hidden',
          }}>
            {/* Exam Title */}
            <div style={{ padding: '24px 32px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#212529' }}>{examDetails.title}</h1>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px', fontSize: '13px', color: '#6c757d' }}>
                <span>Duration: <strong style={{ color: '#212529' }}>{examDetails.duration} minutes</strong></span>
                <span>Questions: <strong style={{ color: '#212529' }}>{examDetails.totalQuestions}</strong></span>
              </div>
            </div>

            {/* Instructions */}
            <div style={{ padding: '24px 32px' }}>
              <h2 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 600, color: '#212529' }}>Important Instructions</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '13px', color: '#495057', lineHeight: 2 }}>
                {[
                  { color: '#dc3545', text: 'Do NOT switch tabs, minimize the window, or open other applications. Each violation is recorded.' },
                  { color: '#dc3545', text: 'Do NOT use keyboard shortcuts (Ctrl+C, Ctrl+V, etc.) or right-click. These are disabled.' },
                  { color: '#dc3545', text: 'Your exam will be auto-submitted when the timer ends. No extensions.' },
                  { color: '#dc3545', text: 'Maximum 5 violations allowed. After 5, your exam will be terminated.' },
                  { color: '#e67e22', text: 'Answers are auto-saved every time you select/type. No need for manual save.' },
                  { color: '#e67e22', text: 'You can navigate between questions using the sidebar or Next/Previous buttons.' },
                  { color: '#e67e22', text: 'Review all answers before submitting. Once submitted, you cannot make changes.' },
                  { color: '#1d4f91', text: 'This session is bound to your current browser and IP address. Do not attempt to login from another device.' },
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: item.color, fontSize: '8px', marginTop: '6px', flexShrink: 0 }}>&#9679;</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Warning */}
            <div style={{ margin: '0 32px 24px 32px', padding: '12px 16px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#664d03' }}>
                <strong>Warning:</strong> By clicking &quot;Start Exam&quot;, you agree to the exam rules.
                Your session will be monitored for academic integrity.
              </p>
            </div>

            {/* Actions */}
            <div style={{ padding: '0 32px 32px 32px', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowInstructions(false);
                  const resolvedExamId = examDetails?.examId || examCode;
                  sessionStorage.removeItem(`exam_session_${resolvedExamId}`);
                  setExamDetails(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#495057',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={startExam}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: '#1d4f91',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Start Exam
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Login form
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
              <div style={{ fontSize: '11px', opacity: 0.75, lineHeight: 1.2 }}>Direct Exam Login</div>
            </div>
          </Link>
          <Link href="/login" style={{ color: '#bee3f8', fontSize: '13px', textDecoration: 'none' }}>
            Staff Sign In
          </Link>
        </div>
      </header>

      {/* Main */}
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
                Exam Portal Login
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6c757d' }}>
                Enter your credentials to access the examination
              </p>
            </div>

            {/* Form */}
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
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="examCode" style={labelStyle}>Exam Code</label>
                  <input
                    id="examCode"
                    type="text"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    placeholder="Enter exam code"
                    required
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="userId" style={labelStyle}>Student ID / Email</label>
                  <input
                    id="userId"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter your student ID or email"
                    required
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="password" style={labelStyle}>Password (Date of Birth)</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="DD-MM-YYYY or DDMMYYYY"
                    required
                    style={inputStyle}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#868e96' }}>
                    Enter your date of birth as password (e.g., 15-08-2000)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ffffff',
                    backgroundColor: loading ? '#6c8ebf' : '#1d4f91',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Verifying...' : 'Login to Exam'}
                </button>
              </form>

              {/* Security notice */}
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
                This system uses device fingerprinting and IP tracking.
                All activities are monitored and logged.
              </div>
            </div>

            {/* Footer links */}
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
              <Link href="/login" style={{ color: '#1d4f91', textDecoration: 'none' }}>Staff Sign In</Link>
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
