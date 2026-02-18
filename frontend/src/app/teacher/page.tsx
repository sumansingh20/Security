'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';

interface ExamData {
  _id: string;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  status: string;
  submissionCount: number;
  violationCount: number;
}

interface DashStats {
  totalExams: number;
  activeExams: number;
  totalStudents: number;
  totalSubmissions: number;
  recentViolations: number;
  averageScore: number;
}

const REFRESH_INTERVAL = 30000;

export default function TeacherDashboard() {
  const [activeExams, setActiveExams] = useState<ExamData[]>([]);
  const [recentExams, setRecentExams] = useState<ExamData[]>([]);
  const [stats, setStats] = useState<DashStats>({ totalExams: 0, activeExams: 0, totalStudents: 0, totalSubmissions: 0, recentViolations: 0, averageScore: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const response = await api.get('/teacher/dashboard');
      const data = response.data?.data;
      if (data) {
        const exams = data.recentExams || [];
        const active = exams.filter((e: ExamData) => e.status === 'ongoing');

        setActiveExams(active);
        setRecentExams(exams.slice(0, 10));
        setStats({
          totalExams: data.stats?.totalExams || 0,
          activeExams: data.stats?.activeExams || active.length,
          totalStudents: data.stats?.totalStudents || 0,
          totalSubmissions: data.stats?.totalSubmissions || 0,
          recentViolations: data.stats?.recentViolations || 0,
          averageScore: data.stats?.averageScore || 0,
        });
        if (data.serverTime) setServerTime(new Date(data.serverTime));
        setLastRefresh(new Date());
      }
    } catch (err: any) {
      console.error('Teacher dashboard fetch failed:', err);
      if (!silent) setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    intervalRef.current = setInterval(() => fetchData(true), REFRESH_INTERVAL);

    // Fetch server time separately as fallback
    const fetchServerTime = async () => {
      try {
        const res = await api.get('/teacher/server-time');
        setServerTime(new Date(res.data.data?.serverTime || Date.now()));
      } catch {
        // serverTime already set from dashboard or defaults to local
      }
    };
    fetchServerTime();

    const timer = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(timer);
    };
  }, [fetchData]);

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Teacher Dashboard">
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading examination data...</span>
        </div>
      </LMSLayout>
    );
  }

  if (error && !stats.totalExams && recentExams.length === 0) {
    return (
      <LMSLayout pageTitle="Teacher Dashboard">
        <div className="lms-alert lms-alert-error animate-shake">
          <div className="lms-alert-title">Error Loading Dashboard</div>
          <div style={{ marginBottom: '10px' }}>{error}</div>
          <button className="lms-btn lms-btn-primary lms-btn-sm" onClick={() => fetchData(false)}>
            🔄 Retry
          </button>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout 
      pageTitle="Teacher Dashboard (Exam Controller)"
      breadcrumbs={[{ label: 'Teacher' }, { label: 'Dashboard' }]}
    >
      {/* Refresh Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div>
          {isRefreshing && <span className="pulse-text" style={{ color: 'var(--primary)' }}>● Refreshing...</span>}
          {!isRefreshing && lastRefresh && <span>Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>}
        </div>
        <button className="lms-btn lms-btn-sm" onClick={() => fetchData(true)} disabled={isRefreshing} style={{ fontSize: '11px', padding: '2px 10px' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
          <div className="lms-stat-icon">📝</div>
          <div className="lms-stat-value">{stats.totalExams}</div>
          <div className="lms-stat-label">Total Exams</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-icon pulse-icon">🟢</div>
          <div className="lms-stat-value">{activeExams.length}</div>
          <div className="lms-stat-label">Active Exams</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">👥</div>
          <div className="lms-stat-value">{stats.totalStudents}</div>
          <div className="lms-stat-label">Students</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon">📊</div>
          <div className="lms-stat-value">{stats.totalSubmissions}</div>
          <div className="lms-stat-label">Submissions</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-violation animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">⚠️</div>
          <div className="lms-stat-value" style={{ color: stats.recentViolations > 0 ? 'var(--error)' : undefined }}>
            {stats.recentViolations}
          </div>
          <div className="lms-stat-label">Violations (24h)</div>
        </div>
      </div>

      {/* Active Exams Alert */}
      {activeExams.length > 0 && (
        <div className="lms-alert lms-alert-warning live-exam-alert animate-pulse-border">
          <div className="live-indicator"></div>
          <div>
            <div className="lms-alert-title">🔴 LIVE EXAMINATION IN PROGRESS</div>
            <div>{activeExams.length} examination(s) currently active. Use Live Monitor for real-time tracking.</div>
          </div>
          <Link href="/teacher/monitor" className="lms-btn lms-btn-primary lms-btn-sm" style={{ marginLeft: 'auto' }}>
            📡 Monitor
          </Link>
        </div>
      )}

      {/* System Info */}
      <div className="lms-info-box animate-fadeIn" style={{ animationDelay: '0.15s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">🖥️</span> System Information
        </div>
        <div className="lms-info-box-body">
          <div className="lms-info-row">
            <div className="lms-info-label">Server Time:</div>
            <div className="lms-info-value font-mono pulse-text">{format(serverTime, 'dd MMM yyyy, HH:mm:ss')}</div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Avg Score:</div>
            <div className="lms-info-value font-mono">{stats.averageScore}%</div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Auto-Submit:</div>
            <div className="lms-info-value"><span className="lms-status lms-status-active">ENABLED</span></div>
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
          <Link href="/teacher/exams/create" className="lms-btn lms-btn-primary">➕ Create Examination</Link>
          <Link href="/teacher/monitor" className="lms-btn">📡 Live Monitor</Link>
          <Link href="/teacher/exams" className="lms-btn">📋 Batch Controller</Link>
          <Link href="/teacher/results" className="lms-btn">📊 Results &amp; Reports</Link>
          <Link href="/teacher/questions" className="lms-btn">📚 Question Bank</Link>
        </div>
      </div>

      {/* Active Examinations Table */}
      {activeExams.length > 0 && (
        <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.25s' }}>
          <div className="lms-section-title"><span className="section-icon">🔴</span> Active Examinations</div>
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>End Time</th>
                  <th>Submissions</th>
                  <th>Violations</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeExams.map((exam) => (
                  <tr key={exam._id}>
                    <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                    <td><strong>{exam.title}</strong></td>
                    <td>{exam.subject || '-'}</td>
                    <td className="font-mono countdown-text">{format(new Date(exam.endTime), 'dd/MM HH:mm')}</td>
                    <td>{exam.submissionCount || 0}</td>
                    <td style={{ color: (exam.violationCount || 0) > 0 ? 'var(--error)' : undefined }}>{exam.violationCount || 0}</td>
                    <td>
                      <Link href={`/teacher/monitor/${exam._id}`} className="lms-btn lms-btn-primary lms-btn-sm">Monitor</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Examinations */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="lms-section-title">
          <span className="section-icon">📋</span> Recent Examinations
          <Link href="/teacher/exams" className="lms-btn lms-btn-sm" style={{ marginLeft: 'auto', fontSize: '11px' }}>View All →</Link>
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
                    <td className="font-mono">{format(new Date(exam.startTime), 'dd/MM HH:mm')}</td>
                    <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM HH:mm')}</td>
                    <td>
                      <span className={`lms-status ${
                        exam.status === 'ongoing' ? 'lms-status-active pulse-status' :
                        exam.status === 'published' ? 'lms-status-info' :
                        exam.status === 'completed' || exam.status === 'archived' ? 'lms-status-closed' : ''
                      }`}>
                        {(exam.status || 'DRAFT').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <Link href={`/teacher/exams/${exam._id}`} className="lms-btn lms-btn-sm">Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="lms-table-empty empty-state-animated">
              <div className="empty-icon">📝</div>
              <div>No examinations found. Create your first examination.</div>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.35s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📖</span> Examination Controller Guidelines
        </div>
        <div className="lms-info-box-body" style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">1</span>Create examinations with proper time windows and batch assignments.</li>
            <li className="guideline-item"><span className="guideline-icon idle">2</span>Batch size limit: 500 students. Batches auto-transition after completion.</li>
            <li className="guideline-item"><span className="guideline-icon submit">3</span>Monitor active examinations using the Live Monitor for real-time status.</li>
            <li className="guideline-item"><span className="guideline-icon violation">4</span>Once an exam starts, it becomes READ-ONLY. No modifications allowed.</li>
            <li className="guideline-item"><span className="guideline-icon terminate">5</span>All violations are logged automatically. Review before publishing results.</li>
            <li className="guideline-item"><span className="guideline-icon active">6</span>Results must be manually published after review.</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
