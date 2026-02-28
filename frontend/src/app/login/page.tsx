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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-blue-200/60 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-500/5 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-500/10 to-cyan-500/5 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">ProctoredExam</h1>
            <p className="text-blue-200/60 text-xs font-medium">Secure Examination Portal</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-blue-200/40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-mono">{serverTime || 'Loading...'}</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-[440px]">
          <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
            
            {/* Mode Tabs */}
            <div className="flex border-b border-white/10">
              <button
                type="button"
                onClick={() => { setLoginMode('student'); setError(''); setSuccess(''); }}
                className={`flex-1 py-4 text-sm font-semibold tracking-wide transition-all duration-300 border-b-2 ${
                  loginMode === 'student'
                    ? 'text-blue-400 border-blue-500 bg-blue-500/10'
                    : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  Student
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setLoginMode('staff'); setError(''); setSuccess(''); }}
                className={`flex-1 py-4 text-sm font-semibold tracking-wide transition-all duration-300 border-b-2 ${
                  loginMode === 'staff'
                    ? 'text-blue-400 border-blue-500 bg-blue-500/10'
                    : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Staff / Admin
                </span>
              </button>
            </div>

            {/* Header */}
            <div className="px-8 pt-8 pb-4 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                {loginMode === 'student' ? (
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {loginMode === 'student' ? 'Student Examination Login' : 'Staff / Admin Login'}
              </h2>
              <p className="text-sm text-blue-200/50 mt-1">
                {loginMode === 'student' ? 'Enter your Student ID and Date of Birth' : 'Enter your credentials to access the system'}
              </p>
            </div>

            {/* Form Body */}
            <div className="px-8 pb-8">
              {success && (
                <div className="mb-5 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-medium flex items-center gap-2" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-5 p-3.5 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm font-medium flex items-center gap-2" style={{ animation: 'shake 0.4s ease' }}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  {error}
                </div>
              )}

              {/* Student Login */}
              {loginMode === 'student' && (
                <form onSubmit={handleStudentSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-blue-100/70 mb-2">Student ID / Roll Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
                      </div>
                      <input type="text" value={studentForm.studentId} onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-white/[0.08] transition-all duration-200" placeholder="e.g., STU001" required autoComplete="username" />
                    </div>
                    <p className="mt-1.5 text-xs text-white/30">Enter the Student ID provided by your institution</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/70 mb-2">Date of Birth</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                      </div>
                      <input type="text" value={studentForm.dob} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8); setStudentForm({ ...studentForm, dob: val }); }} className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder-white/25 text-sm font-mono tracking-wider focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-white/[0.08] transition-all duration-200" placeholder="DDMMYYYY" required maxLength={8} autoComplete="bday" />
                    </div>
                    <p className="mt-1.5 text-xs text-white/30">Format: DDMMYYYY &mdash; Example: 01-Jan-2000 &rarr; <span className="text-blue-300/60 font-mono">01012000</span></p>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Authenticating...</>) : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>Login to Exam Portal</>)}
                  </button>
                </form>
              )}

              {/* Staff Login */}
              {loginMode === 'staff' && (
                <form onSubmit={handleStaffSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-blue-100/70 mb-2">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      </div>
                      <input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-white/[0.08] transition-all duration-200" placeholder="Enter your email" required autoComplete="email" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-100/70 mb-2">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      </div>
                      <input type={showPassword ? 'text' : 'password'} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full pl-12 pr-12 py-3.5 bg-white/[0.06] border border-white/[0.12] rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-white/[0.08] transition-all duration-200" placeholder="Enter your password" required autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors">
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Authenticating...</>) : (<><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>Sign In</>)}
                  </button>
                </form>
              )}

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                <p className="text-xs text-sky-200/70 leading-relaxed">
                  <strong className="text-sky-300/90">Security Notice:</strong>{' '}
                  {loginMode === 'student'
                    ? 'Login is enabled during scheduled examination windows. Unauthorized access attempts are logged.'
                    : 'This is a secured system. All activities are logged and monitored.'}
                </p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="px-8 py-4 bg-white/[0.03] border-t border-white/[0.08] flex items-center justify-center gap-4">
              <Link href="/forgot-password" className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors font-medium">Forgot Password?</Link>
              <span className="w-px h-3 bg-white/10" />
              <Link href="/help" className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors font-medium">Need Help?</Link>
              <span className="w-px h-3 bg-white/10" />
              <Link href="/register" className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors font-medium">Register</Link>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-white/25 sm:hidden">
            <span className="font-mono">{serverTime || 'Loading...'}</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/20 border-t border-white/[0.06] py-4 px-4 text-center">
        <p className="text-xs text-white/25">&copy; 2026 ProctoredExam &middot; Secure Online Examination System</p>
      </footer>
    </div>
  );
}
