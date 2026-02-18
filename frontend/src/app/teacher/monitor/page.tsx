'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ActiveSession {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId?: string;
  };
  exam: {
    _id: string;
    title: string;
  };
  startTime: string;
  lastActivity: string;
  timeRemaining: number;
  questionsAnswered: number;
  totalQuestions: number;
  violationCount: number;
  ipAddress: string;
  sessionId?: string;
  batchNumber?: number;
  status: 'active' | 'idle' | 'suspicious' | 'submitted';
}

interface ActiveExam {
  _id: string;
  title: string;
  activeStudents: number;
  totalStudents: number;
  startTime: string;
  endTime: string;
  batchNumber?: number;
}

export default function TeacherMonitorPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [activeExams, setActiveExams] = useState<ActiveExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [serverTime, setServerTime] = useState(new Date());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push('/my');
    }
  }, [isAuthenticated, user, router]);

  const fetchMonitorData = useCallback(async () => {
    try {
      const [sessionsRes, examsRes] = await Promise.all([
        api.get('/teacher/monitor/sessions', { params: { examId: selectedExam === 'all' ? undefined : selectedExam } }),
        api.get('/teacher/monitor/active-exams')
      ]);
      
      // Handle both array and {sessions: [...]} response formats
      const sessionsData = sessionsRes.data.data?.sessions || sessionsRes.data.data || [];
      const examsData = examsRes.data.data || [];
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setActiveExams(Array.isArray(examsData) ? examsData : []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load monitor data');
      }
      setSessions([]);
      setActiveExams([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedExam]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher')) {
      fetchMonitorData();
    }
  }, [fetchMonitorData, isAuthenticated, user]);

  useEffect(() => {
    const timeTicker = setInterval(() => {
      setServerTime(new Date());
    }, 1000);

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchMonitorData, 5000);
    }
    
    return () => {
      clearInterval(timeTicker);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, fetchMonitorData]);

  const formatTimeRemaining = (seconds: number) => {
    if (!seconds || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleForceSubmit = async (sessionId: string) => {
    if (!confirm('Force submit this student\'s examination? This action cannot be undone.')) return;
    
    try {
      await api.post(`/teacher/monitor/sessions/${sessionId}/force-submit`);
      toast.success('Examination force-submitted');
      fetchMonitorData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to force submit');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('TERMINATE this session? This will invalidate the attempt and the student cannot resume.')) return;
    
    try {
      await api.post(`/teacher/monitor/sessions/${sessionId}/terminate`);
      toast.success('Session terminated');
      fetchMonitorData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to terminate session');
    }
  };

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'teacher')) {
    return null;
  }

  const totalActive = sessions.filter(s => s.status === 'active').length;
  const totalIdle = sessions.filter(s => s.status === 'idle').length;
  const totalSuspicious = sessions.filter(s => s.violationCount > 0).length;
  const totalViolations = sessions.reduce((sum, s) => sum + (s.violationCount || 0), 0);

  return (
    <LMSLayout
      pageTitle="Live Examination Monitor"
      breadcrumbs={[
        { label: 'Teacher' },
        { label: 'Monitoring' },
        { label: 'Live Monitor' }
      ]}
    >
      {/* Server Time & Refresh Status */}
      <div className="lms-info-box mb-4 animate-fadeInDown">
        <div className="lms-info-box-body flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-6 flex-wrap">
            <div className="server-time-display">
              <span className="lms-info-label">Server Time:</span>
              <span className="lms-info-value font-mono ml-2 pulse-text">
                {format(serverTime, 'dd/MM/yyyy HH:mm:ss')}
              </span>
            </div>
            <div>
              <span className="lms-info-label">Last Refresh:</span>
              <span className="lms-info-value font-mono ml-2">
                {format(lastRefresh, 'HH:mm:ss')}
              </span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <label className="lms-checkbox-label text-xs">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className={autoRefresh ? 'text-green-600' : ''}>Auto-refresh (5s)</span>
            </label>
            <button className="lms-btn lms-btn-sm refresh-btn" onClick={fetchMonitorData}>
              <span className="refresh-icon">↻</span> Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-icon">📊</div>
          <div className="lms-stat-value">{sessions.length}</div>
          <div className="lms-stat-label">Total Sessions</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon pulse-icon">🟢</div>
          <div className="lms-stat-value text-green-700">{totalActive}</div>
          <div className="lms-stat-label">Active</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-idle animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon">🟡</div>
          <div className="lms-stat-value text-yellow-600">{totalIdle}</div>
          <div className="lms-stat-label">Idle</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-violation animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">⚠️</div>
          <div className={`lms-stat-value ${totalSuspicious > 0 ? 'text-red-700 shake-value' : ''}`}>
            {totalSuspicious}
          </div>
          <div className="lms-stat-label">With Violations</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-total-violations animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="lms-stat-icon">🚨</div>
          <div className={`lms-stat-value ${totalViolations > 0 ? 'text-red-700' : ''}`}>
            {totalViolations}
          </div>
          <div className="lms-stat-label">Total Violations</div>
        </div>
      </div>

      {/* Alert for Active Exams */}
      {activeExams.length > 0 && (
        <div className="lms-alert lms-alert-warning live-exam-alert animate-pulse-border">
          <div className="live-indicator"></div>
          <div>
            <div className="lms-alert-title">🔴 LIVE EXAMINATION IN PROGRESS</div>
            <div>{activeExams.length} examination(s) currently active with {sessions.length} student(s) online.</div>
          </div>
        </div>
      )}

      {/* Active Examinations */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="lms-section-title">
          <span className="section-icon">📋</span> Active Examinations
        </div>
        {activeExams.length === 0 ? (
          <div className="lms-table-empty empty-state-animated">
            <div className="empty-icon">📭</div>
            <div>No examinations are currently active.</div>
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Started At</th>
                  <th>Ends At</th>
                  <th>Active / Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeExams.map((exam) => (
                  <tr key={exam._id}>
                    <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                    <td>{exam.title}</td>
                    <td className="font-mono">{format(new Date(exam.startTime), 'dd/MM HH:mm')}</td>
                    <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM HH:mm')}</td>
                    <td>
                      <strong>{exam.activeStudents}</strong> / {exam.totalStudents}
                    </td>
                    <td>
                      <button 
                        className={`lms-btn lms-btn-sm ${selectedExam === exam._id ? 'lms-btn-primary' : ''}`}
                        onClick={() => setSelectedExam(selectedExam === exam._id ? 'all' : exam._id)}
                      >
                        {selectedExam === exam._id ? 'Show All' : 'Filter'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Sessions */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="flex justify-between items-center mb-2">
          <div className="lms-section-title mb-0">
            <span className="section-icon">👥</span> Live Sessions
            {selectedExam !== 'all' && <span className="font-normal text-xs ml-2 filter-badge">(Filtered)</span>}
          </div>
          <div className="lms-form-group m-0">
            <select 
              className="lms-select w-48"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              title="Filter by exam"
            >
              <option value="all">All Examinations</option>
              {activeExams.map((exam) => (
                <option key={exam._id} value={exam._id}>{exam.title}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="lms-alert lms-alert-error animate-shake">{error}</div>
        ) : isLoading ? (
          <div className="lms-loading loading-animated">
            <div className="loading-spinner"></div>
            <span>Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="lms-table-empty empty-state-animated">
            <div className="empty-icon">👤</div>
            <div>No active sessions found.</div>
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Progress</th>
                  <th>Time Left</th>
                  <th>Last Activity</th>
                  <th>Violations</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session._id} className={session.violationCount > 3 ? 'bg-red-50' : session.status === 'idle' ? 'bg-yellow-50' : ''}>
                    <td className="font-mono">{session.student?.studentId || session.student?._id?.slice(-6) || '-'}</td>
                    <td>{session.student?.firstName} {session.student?.lastName}</td>
                    <td>
                      {session.questionsAnswered}/{session.totalQuestions}
                      <span className="text-xs text-gray-500 ml-1">
                        ({session.totalQuestions > 0 ? Math.round((session.questionsAnswered / session.totalQuestions) * 100) : 0}%)
                      </span>
                    </td>
                    <td className={`font-mono ${session.timeRemaining < 300 ? 'text-red-700 font-bold' : ''}`}>
                      {formatTimeRemaining(session.timeRemaining)}
                    </td>
                    <td className="font-mono text-xs">
                      {format(new Date(session.lastActivity), 'HH:mm:ss')}
                    </td>
                    <td className={session.violationCount > 0 ? 'text-red-700 font-bold' : ''}>
                      {session.violationCount || 0}
                    </td>
                    <td>
                      <span className={`lms-status ${
                        session.status === 'active' ? 'lms-status-active' :
                        session.status === 'idle' ? 'lms-status-info' :
                        session.status === 'suspicious' ? 'lms-status-closed' : ''
                      }`}>
                        {session.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleForceSubmit(session._id)}
                          className="lms-btn lms-btn-sm"
                          title="Force submit examination"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => handleTerminateSession(session._id)}
                          className="lms-btn lms-btn-sm lms-btn-danger"
                          title="Terminate session"
                        >
                          Terminate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📖</span> Live Monitor Guidelines
        </div>
        <div className="lms-info-box-body text-xs">
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">●</span><strong>Active:</strong> Student is currently answering questions</li>
            <li className="guideline-item"><span className="guideline-icon idle">●</span><strong>Idle:</strong> No activity for more than 60 seconds</li>
            <li className="guideline-item"><span className="guideline-icon violation">●</span><strong>Violations:</strong> Proctoring rule violations (tab switch, copy attempt, etc.)</li>
            <li className="guideline-item"><span className="guideline-icon submit">◆</span><strong>Force Submit:</strong> Submits the exam with current answers</li>
            <li className="guideline-item"><span className="guideline-icon terminate">◆</span><strong>Terminate:</strong> Invalidates the session - student cannot resume</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
