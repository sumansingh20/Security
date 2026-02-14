'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';

interface DashboardStats {
  totalStudents: number;
  totalExams: number;
  activeExams: number;
  totalSubmissions: number;
  recentViolations: number;
  averageScore: number;
}

interface RecentExam {
  _id: string;
  title: string;
  subject: string;
  startTime: string;
  endTime: string;
  submissionCount: number;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState(new Date());

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/admin/dashboard');
        setStats(response.data.data.stats);
        setRecentExams(response.data.data.recentExams || []);
      } catch (err: any) {
        console.error('Failed to fetch dashboard:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();

    const timer = setInterval(() => {
      setServerTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <span className="lms-status lms-status-active">ACTIVE</span>;
      case 'published':
        return <span className="lms-status lms-status-info">PUBLISHED</span>;
      case 'completed':
        return <span className="lms-status lms-status-closed">COMPLETED</span>;
      case 'archived':
        return <span className="lms-status lms-status-closed">ARCHIVED</span>;
      default:
        return <span className="lms-status">DRAFT</span>;
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

  if (error) {
    return (
      <LMSLayout pageTitle="Administrator Dashboard">
        <div className="lms-alert lms-alert-error animate-shake">
          <div className="lms-alert-title">Error Loading Dashboard</div>
          <div>{error}</div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout 
      pageTitle="Administrator Dashboard"
      breadcrumbs={[{ label: 'Administration' }, { label: 'Dashboard' }]}
    >
      {/* System Status */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-icon">👥</div>
          <div className="lms-stat-value">{stats?.totalStudents || 0}</div>
          <div className="lms-stat-label">Total Students</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">📝</div>
          <div className="lms-stat-value">{stats?.totalExams || 0}</div>
          <div className="lms-stat-label">Total Exams</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon pulse-icon">🟢</div>
          <div className="lms-stat-value">{stats?.activeExams || 0}</div>
          <div className="lms-stat-label">Active Exams</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">📊</div>
          <div className="lms-stat-value">{stats?.totalSubmissions || 0}</div>
          <div className="lms-stat-label">Submissions</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-violation animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="lms-stat-icon">⚠️</div>
          <div className="lms-stat-value" style={{ color: stats?.recentViolations ? 'var(--error)' : undefined }}>
            {stats?.recentViolations || 0}
          </div>
          <div className="lms-stat-label">Violations</div>
        </div>
      </div>

      {/* System Health */}
      <div className="lms-info-box animate-fadeIn" style={{ animationDelay: '0.2s' }}>
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
            <div className="lms-info-value">
              <span className="lms-status lms-status-active pulse-status">CONNECTED</span>
            </div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Batch Capacity:</div>
            <div className="lms-info-value">500 students per batch (Hard Limit)</div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Session Timeout:</div>
            <div className="lms-info-value">30 minutes</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="lms-section-title"><span className="section-icon">⚡</span> Quick Actions</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link href="/admin/exams/create" className="lms-btn lms-btn-primary">
            ➕ Create Examination
          </Link>
          <Link href="/admin/users/create" className="lms-btn">
            👤 Add User
          </Link>
          <Link href="/admin/monitor" className="lms-btn">
            📡 Live Monitor
          </Link>
          <Link href="/admin/reports/activity" className="lms-btn">
            📋 View Logs
          </Link>
          <Link href="/admin/reports" className="lms-btn">
            📊 Generate Report
          </Link>
        </div>
      </div>

      {/* Recent Examinations */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        <div className="lms-section-title"><span className="section-icon">📋</span> Recent Examinations</div>
        <div className="lms-table-container">
          {recentExams.length > 0 ? (
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Exam Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Submissions</th>
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
                    <td className="font-mono">{format(new Date(exam.startTime), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM/yyyy HH:mm')}</td>
                    <td>{exam.submissionCount || 0}</td>
                    <td>{getStatusBadge(exam.status)}</td>
                    <td>
                      <Link href={`/admin/exams/${exam._id}`} className="lms-btn lms-btn-sm">
                        Manage
                      </Link>
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
        <div style={{ marginTop: '12px' }}>
          <Link href="/admin/exams" className="lms-btn lms-btn-sm">
            View All Examinations →
          </Link>
        </div>
      </div>

      {/* System Notices */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.5s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📢</span> System Notices
        </div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">●</span>Batch processing is enabled. Maximum 500 students per batch.</li>
            <li className="guideline-item"><span className="guideline-icon submit">●</span>Automatic batch transition is active for all scheduled examinations.</li>
            <li className="guideline-item"><span className="guideline-icon idle">●</span>All login attempts and session data are being logged for audit purposes.</li>
            <li className="guideline-item"><span className="guideline-icon violation">●</span>Emergency read-only mode can be activated from System Settings.</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
