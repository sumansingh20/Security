'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalExams: number;
  activeExams: number;
  publishedExams: number;
  totalSubmissions: number;
  recentViolations: number;
  onlineStudents: number;
  averageScore: number;
}

interface RecentExam {
  _id: string;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  submissionCount: number;
  status: string;
}

interface RecentSubmission {
  _id: string;
  student: { firstName: string; lastName: string } | null;
  exam: { title: string } | null;
  marksObtained: number;
  totalMarks: number;
  status: string;
  submittedAt: string;
}

const REFRESH_INTERVAL = 30000;

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const response = await api.get('/admin/dashboard');
      const data = response.data?.data;
      if (data) {
        setStats(data.stats || null);
        setRecentExams(data.recentExams || []);
        setRecentSubmissions(data.recentSubmissions || []);
        if (data.serverTime) setServerTime(new Date(data.serverTime));
        setLastRefresh(new Date());
      }
    } catch (err: any) {
      console.error('Dashboard fetch failed:', err);
      if (!silent) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
    intervalRef.current = setInterval(() => fetchDashboard(true), REFRESH_INTERVAL);
    const clockTimer = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(clockTimer);
    };
  }, [fetchDashboard]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ongoing': return 'lms-status-active pulse-status';
      case 'published': return 'lms-status-info';
      case 'completed': case 'archived': return 'lms-status-closed';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Administrator Dashboard">
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading dashboard data...</span>
        </div>
      </LMSLayout>
    );
  }

  if (error && !stats) {
    return (
      <LMSLayout pageTitle="Administrator Dashboard">
        <div className="lms-alert lms-alert-error animate-shake">
          <div className="lms-alert-title">Error Loading Dashboard</div>
          <div style={{ marginBottom: '10px' }}>{error}</div>
          <button className="lms-btn lms-btn-primary lms-btn-sm" onClick={() => fetchDashboard(false)}>
            🔄 Retry
          </button>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout 
      pageTitle="Administrator Dashboard"
      breadcrumbs={[{ label: 'Administration' }, { label: 'Dashboard' }]}
    >
      {/* Refresh Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div>
          {isRefreshing && <span className="pulse-text" style={{ color: 'var(--primary)' }}>● Refreshing...</span>}
          {!isRefreshing && lastRefresh && <span>Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>}
        </div>
        <button className="lms-btn lms-btn-sm" onClick={() => fetchDashboard(true)} disabled={isRefreshing} style={{ fontSize: '11px', padding: '2px 10px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
          <div className="lms-stat-icon">👥</div>
          <div className="lms-stat-value">{stats?.totalStudents || 0}</div>
          <div className="lms-stat-label">Students</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-icon">👨‍🏫</div>
          <div className="lms-stat-value">{stats?.totalTeachers || 0}</div>
          <div className="lms-stat-label">Teachers</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">📝</div>
          <div className="lms-stat-value">{stats?.totalExams || 0}</div>
          <div className="lms-stat-label">Total Exams</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon pulse-icon">🟢</div>
          <div className="lms-stat-value">{stats?.activeExams || 0}</div>
          <div className="lms-stat-label">Active Now</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">📊</div>
          <div className="lms-stat-value">{stats?.totalSubmissions || 0}</div>
          <div className="lms-stat-label">Submissions</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-violation animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="lms-stat-icon">⚠️</div>
          <div className="lms-stat-value" style={{ color: (stats?.recentViolations || 0) > 0 ? 'var(--error)' : undefined }}>
            {stats?.recentViolations || 0}
          </div>
          <div className="lms-stat-label">Violations (24h)</div>
        </div>
      </div>

      {/* Active Alert */}
      {(stats?.activeExams || 0) > 0 && (
        <div className="lms-alert lms-alert-warning live-exam-alert animate-pulse-border">
          <div className="live-indicator"></div>
          <div>
            <div className="lms-alert-title">🔴 LIVE EXAMINATIONS IN PROGRESS</div>
            <div>{stats?.activeExams} examination(s) currently active.</div>
          </div>
          <Link href="/admin/monitor" className="lms-btn lms-btn-primary lms-btn-sm" style={{ marginLeft: 'auto' }}>
            📡 Monitor
          </Link>
        </div>
      )}

      {/* System Status */}
      <div className="lms-info-box animate-fadeIn" style={{ animationDelay: '0.15s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">🖥️</span> System Status
        </div>
        <div className="lms-info-box-body">
          <div className="lms-info-row">
            <div className="lms-info-label">Server Time:</div>
            <div className="lms-info-value font-mono pulse-text">{format(serverTime, 'dd MMM yyyy, HH:mm:ss')}</div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Database:</div>
            <div className="lms-info-value"><span className="lms-status lms-status-active pulse-status">CONNECTED</span></div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Avg Score:</div>
            <div className="lms-info-value font-mono">{stats?.averageScore || 0}%</div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Auto-Refresh:</div>
            <div className="lms-info-value"><span className="lms-status lms-status-active">30s</span></div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="lms-section-title"><span className="section-icon">⚡</span> Quick Actions</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/admin/exams/create" className="lms-btn lms-btn-primary">➕ Create Exam</Link>
          <Link href="/admin/users/create" className="lms-btn">👤 Add User</Link>
          <Link href="/admin/monitor" className="lms-btn">📡 Live Monitor</Link>
          <Link href="/admin/logs" className="lms-btn">📋 Audit Logs</Link>
          <Link href="/admin/reports" className="lms-btn">📊 Reports</Link>
          <Link href="/admin/settings" className="lms-btn">⚙️ Settings</Link>
        </div>
      </div>

      {/* Recent Examinations */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="lms-section-title">
          <span className="section-icon">📋</span> Recent Examinations
          <Link href="/admin/exams" className="lms-btn lms-btn-sm" style={{ marginLeft: 'auto', fontSize: '11px' }}>View All →</Link>
        </div>
        <div className="lms-table-container">
          {recentExams.length > 0 ? (
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((exam) => (
                  <tr key={exam._id}>
                    <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                    <td><strong>{exam.title}</strong></td>
                    <td>{exam.subject || '-'}</td>
                    <td className="font-mono">{exam.startTime ? format(new Date(exam.startTime), 'dd/MM HH:mm') : '-'}</td>
                    <td className="font-mono">{exam.endTime ? format(new Date(exam.endTime), 'dd/MM HH:mm') : '-'}</td>
                    <td><span className={`lms-status ${getStatusClass(exam.status)}`}>{(exam.status || 'DRAFT').toUpperCase()}</span></td>
                    <td><Link href={`/admin/exams/${exam._id}`} className="lms-btn lms-btn-sm">Manage</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="lms-table-empty empty-state-animated">
              <div className="empty-icon">📝</div>
              <div>No examinations found. Create your first exam.</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      {recentSubmissions.length > 0 && (
        <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.35s' }}>
          <div className="lms-section-title">
            <span className="section-icon">📊</span> Recent Submissions
            <Link href="/admin/results" className="lms-btn lms-btn-sm" style={{ marginLeft: 'auto', fontSize: '11px' }}>View All →</Link>
          </div>
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.map((sub) => (
                  <tr key={sub._id}>
                    <td>{sub.student ? `${sub.student.firstName} ${sub.student.lastName}` : 'Unknown'}</td>
                    <td>{sub.exam?.title || '-'}</td>
                    <td className="font-mono">
                      <strong>{sub.marksObtained}</strong> / {sub.totalMarks}
                      {sub.totalMarks > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({Math.round((sub.marksObtained / sub.totalMarks) * 100)}%)</span>}
                    </td>
                    <td><span className={`lms-status ${sub.status === 'submitted' || sub.status === 'graded' ? 'lms-status-active' : 'lms-status-pending'}`}>{(sub.status || 'pending').toUpperCase()}</span></td>
                    <td className="font-mono">{sub.submittedAt ? format(new Date(sub.submittedAt), 'dd/MM HH:mm') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Notices */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📢</span> System Notices
        </div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">●</span>Batch processing enabled — Maximum 500 students per batch.</li>
            <li className="guideline-item"><span className="guideline-icon submit">●</span>Automatic batch transition is active for scheduled examinations.</li>
            <li className="guideline-item"><span className="guideline-icon idle">●</span>All login attempts and sessions are logged for audit.</li>
            <li className="guideline-item"><span className="guideline-icon violation">●</span>Emergency read-only mode available from System Settings.</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
