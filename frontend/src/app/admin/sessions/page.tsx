'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { format } from 'date-fns';

interface ExamSession {
  _id: string;
  exam: {
    _id: string;
    title: string;
    subject: string;
  };
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    email: string;
  };
  batch: number;
  sessionToken: string;
  ipAddress: string;
  browserFingerprint: string;
  userAgent: string;
  status: 'active' | 'submitted' | 'force_submitted' | 'expired' | 'violation_terminated';
  startedAt: string;
  serverEndTime: string;
  submittedAt?: string;
  lastActivityAt: string;
  violationCount: number;
  maxViolationsAllowed: number;
  autoSaveCount: number;
  currentQuestionIndex: number;
  answeredCount: number;
}

export default function SessionInspectorPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverTime, setServerTime] = useState(new Date());
  const [filters, setFilters] = useState({
    status: 'active',
    examId: '',
    search: ''
  });
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin') {
      router.push('/my');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      setServerTime(new Date());
      fetchSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [filters]);

  const fetchSessions = async () => {
    try {
      const params: any = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.examId) params.examId = filters.examId;
      if (filters.search) params.search = filters.search;

      const response = await api.get('/admin/exam-sessions', { params });
      setSessions(response.data.data?.sessions || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const getRemainingTime = (session: ExamSession) => {
    if (session.status !== 'active') return '-';
    const end = new Date(session.serverEndTime).getTime();
    const now = serverTime.getTime();
    const remaining = Math.max(0, Math.floor((end - now) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'submitted': return '✅';
      case 'force_submitted': return '⚡';
      case 'expired': return '⏰';
      case 'violation_terminated': return '🚫';
      default: return '📋';
    }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const submittedSessions = sessions.filter(s => s.status === 'submitted');
  const violationSessions = sessions.filter(s => s.violationCount > 0);

  const terminateSession = async (sessionId: string, reason: string) => {
    if (!confirm(`Terminate session? Reason: ${reason}`)) return;
    
    setActionLoading(true);
    try {
      await api.post(`/admin/exam-sessions/${sessionId}/terminate`, { reason });
      fetchSessions();
      setSelectedSession(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to terminate session');
    } finally {
      setActionLoading(false);
    }
  };

  const forceSubmit = async (sessionId: string) => {
    if (!confirm('Force submit this session? Student will receive their current answers.')) return;
    
    setActionLoading(true);
    try {
      await api.post(`/admin/exam-sessions/${sessionId}/force-submit`);
      fetchSessions();
      setSelectedSession(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to force submit');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <LMSLayout pageTitle="Session Inspector">
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading exam sessions...</span>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Session Inspector"
      breadcrumbs={[
        { label: 'Administration' },
        { label: 'Monitoring' },
        { label: 'Session Inspector' }
      ]}
    >
      {/* Live Server Time Banner */}
      <div className="lms-info-box animate-fadeInDown" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)', color: '#fff' }}>
        <div className="lms-info-box-body flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-6 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <span className="live-indicator"></span>
              <span className="font-medium">LIVE</span>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>🕐 Server Time:</span>
              <span className="font-mono ml-2 pulse-text">{format(serverTime, 'dd/MM/yyyy HH:mm:ss')}</span>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>⏱️ Auto-refresh:</span>
              <span className="font-mono ml-2">5 seconds</span>
            </div>
          </div>
          <button className="lms-btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }} onClick={fetchSessions}>
            <span className="refresh-icon">↻</span> Refresh Now
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.1s', position: 'relative' }}>
          <div className="lms-stat-icon">🟢</div>
          <div className="lms-stat-value">{activeSessions.length}</div>
          <div className="lms-stat-label">Active Sessions</div>
          {activeSessions.length > 0 && <div className="live-indicator" style={{ position: 'absolute', top: '10px', right: '10px' }}></div>}
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">✅</div>
          <div className="lms-stat-value">{submittedSessions.length}</div>
          <div className="lms-stat-label">Submitted</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-violation animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon">⚠️</div>
          <div className="lms-stat-value">{violationSessions.length}</div>
          <div className="lms-stat-label">With Violations</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">📊</div>
          <div className="lms-stat-value">{sessions.length}</div>
          <div className="lms-stat-label">Total Sessions</div>
        </div>
      </div>

      {/* Active Alert */}
      {activeSessions.length > 0 && (
        <div className="live-exam-alert animate-pulse-border animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3">
            <span className="live-indicator"></span>
            <span className="font-semibold">⚠️ {activeSessions.length} Active Session(s)</span>
          </div>
          <span className="text-sm">Students are currently taking exams. All actions are logged.</span>
        </div>
      )}

      {/* Filters */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.35s' }}>
        <div className="lms-section-title"><span className="section-icon">🔍</span> Filter Sessions</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="lms-form-group" style={{ margin: 0, minWidth: '150px' }}>
            <label className="lms-label">Status</label>
            <select
              className="lms-select"
              title="Filter by status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Sessions</option>
              <option value="active">🟢 Active Only</option>
              <option value="submitted">✅ Submitted</option>
              <option value="force_submitted">⚡ Force Submitted</option>
              <option value="expired">⏰ Expired</option>
              <option value="violation_terminated">🚫 Violation Terminated</option>
            </select>
          </div>
          <div className="lms-form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="lms-label">Search Student</label>
            <input
              type="text"
              className="lms-input"
              placeholder="Student ID / Name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        <div className="lms-section-title"><span className="section-icon">📋</span> Exam Sessions</div>
        
        {error ? (
          <div className="lms-alert lms-alert-danger">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="lms-table-empty empty-state-animated">
            <div className="empty-icon">🎓</div>
            <div>No sessions found matching your criteria.</div>
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th>Remaining</th>
                  <th>Progress</th>
                  <th>Violations</th>
                  <th>IP Address</th>
                  <th>Last Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, idx) => (
                  <tr 
                    key={session._id}
                    className={`animate-fadeIn ${session.violationCount >= session.maxViolationsAllowed - 1 ? 'bg-red-50' : ''}`}
                    style={{ animationDelay: `${0.05 * idx}s` }}
                  >
                    <td>
                      <div>
                        <strong>{session.student.firstName} {session.student.lastName}</strong>
                        <div className="text-xs text-muted">{session.student.studentId}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        {session.exam.title}
                        <div className="text-xs text-muted">{session.exam.subject}</div>
                      </div>
                    </td>
                    <td><span className="lms-badge">Batch {session.batch}</span></td>
                    <td>
                      <span className={`lms-status ${session.status === 'active' ? 'lms-status-active' : session.status === 'submitted' ? 'lms-status-published' : 'lms-status-closed'}`}>
                        {getStatusIcon(session.status)} {session.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-mono">
                      {session.status === 'active' ? (
                        <span className="pulse-text">{getRemainingTime(session)}</span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className="lms-badge">Q{session.currentQuestionIndex + 1}</span>
                      <span className="text-xs text-muted ml-1">({session.autoSaveCount} saves)</span>
                    </td>
                    <td>
                      <span className={session.violationCount >= session.maxViolationsAllowed - 1 ? 'text-red-600 font-bold' : ''}>
                        {session.violationCount} / {session.maxViolationsAllowed}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{session.ipAddress}</td>
                    <td className="text-xs">{format(new Date(session.lastActivityAt), 'HH:mm:ss')}</td>
                    <td>
                      <button className="lms-btn lms-btn-sm" onClick={() => setSelectedSession(session)}>
                        🔍 Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.5s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📖</span> Session Monitoring Guidelines
        </div>
        <div className="lms-info-box-body text-xs">
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">●</span><strong>Active:</strong> Student is currently taking the exam</li>
            <li className="guideline-item"><span className="guideline-icon submit">●</span><strong>Submitted:</strong> Student completed and submitted normally</li>
            <li className="guideline-item"><span className="guideline-icon idle">●</span><strong>Force Submitted:</strong> Admin force-submitted the exam</li>
            <li className="guideline-item"><span className="guideline-icon violation">●</span><strong>Violation Terminated:</strong> Session ended due to violations</li>
          </ul>
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="lms-modal-overlay animate-fadeIn" onClick={() => setSelectedSession(null)}>
          <div className="lms-modal animate-scaleIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '95%' }}>
            <div className="lms-modal-header">
              <h3><span className="section-icon">🔍</span> Session Details</h3>
              <button className="lms-modal-close" onClick={() => setSelectedSession(null)}>×</button>
            </div>
            <div className="lms-modal-body">
              <div className="lms-table-container">
                <table className="lms-table">
                  <tbody>
                    <tr><td className="text-muted" style={{ width: '150px' }}>👤 Student</td><td><strong>{selectedSession.student.firstName} {selectedSession.student.lastName}</strong></td></tr>
                    <tr><td className="text-muted">🆔 Student ID</td><td>{selectedSession.student.studentId}</td></tr>
                    <tr><td className="text-muted">📧 Email</td><td>{selectedSession.student.email}</td></tr>
                    <tr><td className="text-muted">📝 Exam</td><td>{selectedSession.exam.title}</td></tr>
                    <tr><td className="text-muted">📊 Batch</td><td>Batch {selectedSession.batch}</td></tr>
                    <tr><td className="text-muted">▶️ Started At</td><td>{format(new Date(selectedSession.startedAt), 'dd/MM/yyyy HH:mm:ss')}</td></tr>
                    <tr><td className="text-muted">⏱️ Server End</td><td>{format(new Date(selectedSession.serverEndTime), 'dd/MM/yyyy HH:mm:ss')}</td></tr>
                    <tr><td className="text-muted">⏳ Remaining</td><td className="font-mono">{getRemainingTime(selectedSession)}</td></tr>
                    <tr><td className="text-muted">⚠️ Violations</td><td className={selectedSession.violationCount >= selectedSession.maxViolationsAllowed - 1 ? 'text-red-600 font-bold' : ''}>{selectedSession.violationCount} / {selectedSession.maxViolationsAllowed}</td></tr>
                    <tr><td className="text-muted">🌐 IP Address</td><td className="font-mono">{selectedSession.ipAddress}</td></tr>
                    <tr><td className="text-muted">💾 Auto-saves</td><td>{selectedSession.autoSaveCount}</td></tr>
                  </tbody>
                </table>
              </div>

              {selectedSession.status === 'active' && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <div className="lms-alert lms-alert-warning" style={{ marginBottom: '12px', padding: '10px', background: '#fef3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
                    ⚠️ <strong>Warning:</strong> These actions are irreversible and will be logged.
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="lms-btn" style={{ background: '#f59e0b', color: '#fff' }} onClick={() => forceSubmit(selectedSession._id)} disabled={actionLoading}>
                      {actionLoading ? '⏳' : '⚡'} Force Submit
                    </button>
                    <button className="lms-btn" style={{ background: '#ef4444', color: '#fff' }} onClick={() => terminateSession(selectedSession._id, 'admin_action')} disabled={actionLoading}>
                      {actionLoading ? '⏳' : '🚫'} Terminate Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
