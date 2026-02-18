'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface SessionInfo {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId?: string;
    rollNumber?: string;
  };
  exam: { _id: string; title: string };
  status: 'active' | 'submitted' | 'force_submitted' | 'expired' | 'violation_terminated';
  startedAt: string;
  serverEndTime: string;
  submittedAt?: string;
  lastActivityAt: string;
  violationCount: number;
  answeredCount: number;
  currentQuestionIndex: number;
  batch: number;
}

interface BatchInfo {
  _id: string;
  batchNumber: number;
  status: string;
  activeCount?: number;
  submittedCount?: number;
  maxCapacity?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
}

interface ViolationInfo {
  _id: string;
  student: { firstName: string; lastName: string; studentId?: string };
  type: string;
  severity: string;
  createdAt: string;
}

export default function ExamMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user, isAuthenticated } = useAuthStore();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [violations, setViolations] = useState<ViolationInfo[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const refreshRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin' && user?.role !== 'teacher') { router.push('/my'); return; }
  }, [isAuthenticated, user, router]);

  const fetchMonitorData = useCallback(async () => {
    try {
      const basePath = user?.role === 'admin' ? '/admin' : '/teacher';
      const [sessionsRes, batchesRes, violationsRes, examRes] = await Promise.all([
        api.get(`${basePath}/monitor/sessions`, { params: { examId } }).catch(() => ({ data: { data: [] } })),
        api.get(`${basePath}/exams/${examId}/batches`).catch(() => ({ data: { data: { batches: [] } } })),
        api.get(`${basePath}/exams/${examId}/violations`).catch(() => ({ data: { data: { violations: [] } } })),
        api.get(`${basePath}/exams/${examId}`).catch(() => ({ data: { data: { exam: {} } } })),
      ]);

      const sessionData = sessionsRes.data.data?.sessions || sessionsRes.data.data || [];
      setSessions(Array.isArray(sessionData) ? sessionData : []);

      const batchData = batchesRes.data.data?.batches || batchesRes.data.data || [];
      setBatches(Array.isArray(batchData) ? batchData : []);

      const violationData = violationsRes.data.data?.violations || violationsRes.data.data || [];
      setViolations(Array.isArray(violationData) ? violationData.slice(0, 20) : []);

      const exam = examRes.data.data?.exam || examRes.data.data || {};
      setExamTitle(exam.title || 'Exam');

      setLastRefresh(new Date());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load monitor data');
    } finally {
      setLoading(false);
    }
  }, [examId, user?.role]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher')) {
      fetchMonitorData();
    }
  }, [fetchMonitorData, isAuthenticated, user]);

  useEffect(() => {
    if (autoRefresh) {
      refreshRef.current = setInterval(fetchMonitorData, 5000);
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [autoRefresh, fetchMonitorData]);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const submittedSessions = sessions.filter(s => ['submitted', 'force_submitted'].includes(s.status));
  const terminatedSessions = sessions.filter(s => s.status === 'violation_terminated');
  const totalViolations = sessions.reduce((sum, s) => sum + (s.violationCount || 0), 0);

  const handleForceSubmit = async (sessionId: string) => {
    if (!confirm('Force submit this student? Their exam will be submitted immediately.')) return;
    setActionLoading(true);
    try {
      const basePath = user?.role === 'admin' ? '/admin' : '/teacher';
      await api.post(`${basePath}/monitor/sessions/${sessionId}/force-submit`);
      fetchMonitorData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to force submit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = async (sessionId: string) => {
    if (!confirm('Terminate this session? The student will be removed from the exam.')) return;
    setActionLoading(true);
    try {
      const basePath = user?.role === 'admin' ? '/admin' : '/teacher';
      await api.post(`${basePath}/monitor/sessions/${sessionId}/terminate`);
      fetchMonitorData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to terminate session');
    } finally {
      setActionLoading(false);
    }
  };

  const getRemainingTime = (session: SessionInfo) => {
    if (session.status !== 'active') return '-';
    const end = new Date(session.serverEndTime).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateString: string) => {
    try { return new Date(dateString).toLocaleTimeString(); } catch { return '-'; }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      active: { bg: 'bg-green-100 text-green-800', label: 'Active' },
      submitted: { bg: 'bg-blue-100 text-blue-800', label: 'Submitted' },
      force_submitted: { bg: 'bg-orange-100 text-orange-800', label: 'Force Submitted' },
      expired: { bg: 'bg-gray-100 text-gray-800', label: 'Expired' },
      violation_terminated: { bg: 'bg-red-100 text-red-800', label: 'Terminated' },
    };
    const info = map[status] || { bg: 'bg-gray-100 text-gray-600', label: status };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.bg}`}>{info.label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-900 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href={user?.role === 'admin' ? '/admin/monitor' : '/teacher/monitor'} className="text-blue-200 hover:text-white text-sm">
                &larr; All Exams
              </Link>
            </div>
            <h1 className="text-xl font-bold mt-1">Live Monitor: {examTitle}</h1>
            <p className="text-sm text-blue-200">HTTP polling every 5s</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded text-sm ${autoRefresh ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-200'}`}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button
              onClick={fetchMonitorData}
              className="px-3 py-1 bg-blue-700 rounded text-sm hover:bg-blue-600"
            >
              Refresh Now
            </button>
            <span className="text-sm text-blue-200">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={fetchMonitorData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Retry</button>
          </div>
        </div>
      ) : (
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-800">{sessions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-3xl font-bold text-green-600">{activeSessions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="text-3xl font-bold text-blue-600">{submittedSessions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Terminated</p>
              <p className="text-3xl font-bold text-red-600">{terminatedSessions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Violations</p>
              <p className="text-3xl font-bold text-yellow-600">{totalViolations}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Batches</p>
              <p className="text-3xl font-bold text-purple-600">{batches.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Students Table */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  Sessions ({sessions.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Violations</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Left</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {session.student?.firstName} {session.student?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {session.student?.rollNumber || session.student?.studentId || session.student?.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(session.status)}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {session.answeredCount || 0} answered &middot; Q{(session.currentQuestionIndex || 0) + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            (session.violationCount || 0) > 3 ? 'bg-red-100 text-red-800' :
                            (session.violationCount || 0) > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {session.violationCount || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                          {getRemainingTime(session)}
                        </td>
                        <td className="px-4 py-3">
                          {session.status === 'active' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleForceSubmit(session._id)}
                                disabled={actionLoading}
                                className="text-xs text-orange-600 hover:text-orange-800 disabled:opacity-50"
                              >
                                Force Submit
                              </button>
                              <button
                                onClick={() => handleTerminate(session._id)}
                                disabled={actionLoading}
                                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                Terminate
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No exam sessions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Batch Info */}
              {batches.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h2 className="font-semibold text-gray-900">Batches</h2>
                  </div>
                  <div className="p-4 space-y-2">
                    {batches.map((batch) => (
                      <div key={batch._id || batch.batchNumber} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium text-sm">Batch {batch.batchNumber}</span>
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                            batch.status === 'active' ? 'bg-green-100 text-green-800' :
                            batch.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {batch.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {batch.activeCount || 0}/{batch.maxCapacity || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Violations */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-gray-900">Recent Violations</h2>
                </div>
                <div className="p-4 max-h-80 overflow-y-auto">
                  <div className="space-y-3">
                    {violations.map((v) => (
                      <div key={v._id} className="flex items-start space-x-3 text-sm border-b border-gray-50 pb-2">
                        <span className={`text-lg ${
                          v.severity === 'high' || v.severity === 'critical' ? 'text-red-500' :
                          v.severity === 'medium' ? 'text-orange-500' : 'text-yellow-500'
                        }`}>&#9888;</span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {v.student?.firstName} {v.student?.lastName}
                          </p>
                          <p className="text-gray-500">{(v.type || '').replace(/[-_]/g, ' ')}</p>
                          <p className="text-xs text-gray-400">{formatTime(v.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                    {violations.length === 0 && (
                      <p className="text-center text-gray-500 text-sm py-4">No violations recorded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-gray-900">Quick Actions</h2>
                </div>
                <div className="p-4 space-y-2">
                  <Link
                    href={`/${user?.role === 'admin' ? 'admin' : 'teacher'}/exams/${examId}/results`}
                    className="block w-full text-left px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm"
                  >
                    View Results & Analytics
                  </Link>
                  <Link
                    href={`/${user?.role === 'admin' ? 'admin' : 'teacher'}/exams/${examId}`}
                    className="block w-full text-left px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm"
                  >
                    Exam Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
