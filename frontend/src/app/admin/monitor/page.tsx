'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

export default function LiveMonitorPage() {
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

  const fetchMonitorData = async () => {
    try {
      const [sessionsRes, examsRes] = await Promise.all([
        api.get('/admin/monitor/sessions', { params: { examId: selectedExam === 'all' ? undefined : selectedExam } }),
        api.get('/admin/monitor/active-exams')
      ]);
      
      // Handle both array and {sessions: [...]} response formats
      const sessionsData = sessionsRes.data.data?.sessions || sessionsRes.data.data || [];
      const examsData = examsRes.data.data || [];
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setActiveExams(Array.isArray(examsData) ? examsData : []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      // Don't show error if it's just empty data
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load monitor data');
      }
      setSessions([]);
      setActiveExams([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    fetchMonitorData();
  }, [selectedExam]);

  useEffect(() => {
    // Server time ticker
    const timeTicker = setInterval(() => {
      setServerTime(new Date());
    }, 1000);

    // Auto-refresh data
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchMonitorData, 5000);
    }
    
    return () => {
      clearInterval(timeTicker);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, selectedExam]);

  const formatTimeRemaining = (seconds: number) => {
    if (!seconds || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleForceSubmit = async (sessionId: string) => {
    if (!confirm('Force submit this student\'s examination? This action cannot be undone.')) return;
    
    try {
      await api.post(`/admin/monitor/sessions/${sessionId}/force-submit`);
      toast.success('Examination force-submitted');
      fetchMonitorData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to force submit');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('TERMINATE this session? This will invalidate the attempt and the student cannot resume.')) return;
    
    try {
      await api.post(`/admin/monitor/sessions/${sessionId}/terminate`);
      toast.success('Session terminated');
      fetchMonitorData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to terminate session');
    }
  };

  // Calculate summary stats
  const totalActive = sessions.filter(s => s.status === 'active').length;
  const totalIdle = sessions.filter(s => s.status === 'idle').length;
  const totalSuspicious = sessions.filter(s => s.violationCount > 0).length;
  const totalViolations = sessions.reduce((sum, s) => sum + (s.violationCount || 0), 0);

  return (
    <LMSLayout
      pageTitle="Live Examination Monitor"
      breadcrumbs={[
        { label: 'Administration' },
        { label: 'Monitoring' },
        { label: 'Live Monitor' }
      ]}
    >
      {/* Server Time & Refresh Status */}
      <div className="lms-info-box" style={{ marginBottom: '16px' }}>
        <div className="lms-info-box-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <span className="lms-info-label">Server Time:</span>
              <span className="lms-info-value font-mono" style={{ marginLeft: '8px' }}>
                {format(serverTime, 'dd/MM/yyyy HH:mm:ss')}
              </span>
            </div>
            <div>
              <span className="lms-info-label">Last Refresh:</span>
              <span className="lms-info-value font-mono" style={{ marginLeft: '8px' }}>
                {format(lastRefresh, 'HH:mm:ss')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label className="lms-checkbox-label" style={{ fontSize: '12px' }}>
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (5s)
            </label>
            <button className="lms-btn lms-btn-sm" onClick={fetchMonitorData}>
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="lms-stats-row">
        <div className="lms-stat">
          <div className="lms-stat-value">{sessions.length}</div>
          <div className="lms-stat-label">Total Sessions</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{totalActive}</div>
          <div className="lms-stat-label">Active</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value" style={{ color: '#ca8a04' }}>{totalIdle}</div>
          <div className="lms-stat-label">Idle</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value" style={{ color: totalSuspicious > 0 ? 'var(--error)' : undefined }}>
            {totalSuspicious}
          </div>
          <div className="lms-stat-label">With Violations</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value" style={{ color: totalViolations > 0 ? 'var(--error)' : undefined }}>
            {totalViolations}
          </div>
          <div className="lms-stat-label">Total Violations</div>
        </div>
      </div>

      {/* Alert for Active Exams */}
      {activeExams.length > 0 && (
        <div className="lms-alert lms-alert-warning">
          <div className="lms-alert-title">LIVE EXAMINATION IN PROGRESS</div>
          <div>{activeExams.length} examination(s) currently active with {sessions.length} student(s) online.</div>
        </div>
      )}

      {/* Active Examinations */}
      <div className="lms-section">
        <div className="lms-section-title">Active Examinations</div>
        {activeExams.length === 0 ? (
          <div className="lms-table-empty">No examinations are currently active.</div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Started At</th>
                  <th>Ends At</th>
                  <th>Batch</th>
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
                    <td>{exam.batchNumber || 1}</td>
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

      {/* Filter */}
      <div className="lms-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div className="lms-section-title" style={{ marginBottom: 0 }}>
            Live Sessions
            {selectedExam !== 'all' && <span style={{ fontWeight: 'normal', fontSize: '11px', marginLeft: '8px' }}>(Filtered)</span>}
          </div>
          <div className="lms-form-group" style={{ margin: 0 }}>
            <select 
              className="lms-select"
              style={{ width: '200px' }}
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="all">All Examinations</option>
              {activeExams.map((exam) => (
                <option key={exam._id} value={exam._id}>{exam.title}</option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="lms-alert lms-alert-error">{error}</div>
        ) : isLoading ? (
          <div className="lms-loading">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="lms-table-empty">No active sessions found.</div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Batch</th>
                  <th>Progress</th>
                  <th>Time Left</th>
                  <th>Last Activity</th>
                  <th>IP Address</th>
                  <th>Session ID</th>
                  <th>Violations</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session._id} style={{ 
                    backgroundColor: session.violationCount > 3 ? 'rgba(127, 29, 29, 0.1)' : 
                                    session.status === 'idle' ? 'rgba(202, 138, 4, 0.1)' : undefined 
                  }}>
                    <td className="font-mono">{session.student?.studentId || session.student?._id?.slice(-6) || '-'}</td>
                    <td>{session.student?.firstName} {session.student?.lastName}</td>
                    <td>{session.batchNumber || 1}</td>
                    <td>
                      {session.questionsAnswered}/{session.totalQuestions}
                      <span style={{ fontSize: '10px', color: '#666', marginLeft: '4px' }}>
                        ({session.totalQuestions > 0 ? Math.round((session.questionsAnswered / session.totalQuestions) * 100) : 0}%)
                      </span>
                    </td>
                    <td className="font-mono" style={{ 
                      color: session.timeRemaining < 300 ? 'var(--error)' : undefined,
                      fontWeight: session.timeRemaining < 300 ? 'bold' : undefined
                    }}>
                      {formatTimeRemaining(session.timeRemaining)}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px' }}>
                      {format(new Date(session.lastActivity), 'HH:mm:ss')}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px' }}>{session.ipAddress || '-'}</td>
                    <td className="font-mono" style={{ fontSize: '10px' }}>{session.sessionId?.slice(-8) || '-'}</td>
                    <td style={{ color: session.violationCount > 0 ? 'var(--error)' : undefined, fontWeight: session.violationCount > 0 ? 'bold' : undefined }}>
                      {session.violationCount || 0}
                    </td>
                    <td>
                      <span className={`lms-status ${
                        session.status === 'active' ? 'lms-status-active' :
                        session.status === 'idle' ? 'lms-status-info' :
                        session.status === 'suspicious' ? 'lms-status-closed' :
                        session.status === 'submitted' ? '' : ''
                      }`}>
                        {session.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
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
      <div className="lms-info-box">
        <div className="lms-info-box-header">Live Monitor Guidelines</div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li><strong>Active:</strong> Student is currently answering questions</li>
            <li><strong>Idle:</strong> No activity for more than 60 seconds</li>
            <li><strong>Violations:</strong> Count of proctoring rule violations (tab switch, copy attempt, etc.)</li>
            <li><strong>Force Submit:</strong> Submits the exam with current answers</li>
            <li><strong>Terminate:</strong> Invalidates the session - student cannot resume</li>
            <li>Sessions with &gt;3 violations are highlighted in red</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
