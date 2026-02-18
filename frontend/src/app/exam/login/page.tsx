'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
          // Resume existing session - store with examId for attempt page
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

      // Store session token using the server-returned examId
      const resolvedExamId = data.examId || examCode;
      sessionStorage.setItem(`exam_session_${resolvedExamId}`, data.sessionToken);

      // Show instructions before starting
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

  // Instructions screen
  if (showInstructions && examDetails) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{examDetails.title}</h1>
            <div className="flex justify-center space-x-6 text-sm text-gray-600">
              <span>Duration: <strong>{examDetails.duration} minutes</strong></span>
              <span>Questions: <strong>{examDetails.totalQuestions}</strong></span>
            </div>
          </div>

          <div className="border-t border-b py-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Important Instructions</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-red-500 mr-2">●</span>
                <span>Do NOT switch tabs, minimize the window, or open other applications. Each violation is recorded.</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">●</span>
                <span>Do NOT use keyboard shortcuts (Ctrl+C, Ctrl+V, etc.) or right-click. These are disabled.</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">●</span>
                <span>Your exam will be <strong>auto-submitted</strong> when the timer ends. No extensions.</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">●</span>
                <span>Maximum <strong>5 violations</strong> allowed. After 5, your exam will be terminated.</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">●</span>
                <span>Answers are auto-saved every time you select/type. No need for manual save.</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">●</span>
                <span>You can navigate between questions using the sidebar or Next/Previous buttons.</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">●</span>
                <span>Review all answers before submitting. Once submitted, you cannot make changes.</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">●</span>
                <span>This session is bound to your current browser and IP address. Do not attempt to login from another device.</span>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> By clicking "Start Exam", you agree to the exam rules. 
              Your session will be monitored for academic integrity.
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => {
                setShowInstructions(false);
                const resolvedExamId = examDetails?.examId || examCode;
                sessionStorage.removeItem(`exam_session_${resolvedExamId}`);
                setExamDetails(null);
              }}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={startExam}
              className="flex-1 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Secure examination system</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam Code
            </label>
            <input
              type="text"
              value={examCode}
              onChange={(e) => setExamCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter exam code"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student ID / Email
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your student ID or email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password (Date of Birth)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="DD-MM-YYYY or DDMMYYYY"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your date of birth as password (e.g., 15-08-2000)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            ) : (
              'Login to Exam'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>This system uses device fingerprinting and IP tracking.</p>
            <p>All activities are monitored and logged.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
