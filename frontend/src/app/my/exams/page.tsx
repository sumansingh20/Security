'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useExamStore } from '@/store/examStore';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';
import api from '@/lib/api';

type ExamFilter = 'all' | 'available' | 'upcoming' | 'completed' | 'ended';

export default function ExamListPage() {
  const { availableExams, fetchAvailableExams, isLoadingExams, examError } = useExamStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ExamFilter>('all');
  const [serverTime, setServerTime] = useState(new Date());

  useEffect(() => {
    fetchAvailableExams();
    // Fetch real server time
    api.get('/student/server-time').then(res => {
      const st = res.data?.data?.serverTime;
      if (st) setServerTime(new Date(st));
    }).catch(() => {});
  }, [fetchAvailableExams]);

  useEffect(() => {
    const timer = setInterval(() => setServerTime(prev => new Date(prev.getTime() + 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Backend returns exam.status: 'upcoming' | 'available' | 'in-progress' | 'completed' | 'ended'
  const filteredExams = availableExams.filter((exam) => {
    const matchesSearch =
      exam.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    switch (filter) {
      case 'available':
        return exam.status === 'available' || exam.status === 'in-progress';
      case 'upcoming':
        return exam.status === 'upcoming';
      case 'completed':
        return exam.status === 'completed';
      case 'ended':
        return exam.status === 'ended';
      default:
        return true;
    }
  });

  const getStatusDisplay = (exam: any) => {
    switch (exam.status) {
      case 'in-progress':
        return { text: 'IN PROGRESS', className: 'lms-status-info' };
      case 'available':
        return { text: 'OPEN', className: 'lms-status-active' };
      case 'upcoming':
        return { text: 'UPCOMING', className: 'lms-status-pending' };
      case 'completed':
        return { text: 'COMPLETED', className: '' };
      case 'ended':
      case 'archived':
        return { text: 'CLOSED', className: 'lms-status-closed' };
      default:
        return { text: exam.status?.toUpperCase() || 'UNKNOWN', className: '' };
    }
  };

  const activeCount = availableExams.filter(e => e.status === 'available' || e.status === 'in-progress').length;
  const completedCount = availableExams.filter(e => e.status === 'completed').length;

  if (isLoadingExams) {
    return (
      <LMSLayout
        pageTitle="Available Examinations"
        breadcrumbs={[{ label: 'Student' }, { label: 'Examinations' }]}
      >
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading examinations...</span>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Available Examinations"
      breadcrumbs={[{ label: 'Student' }, { label: 'Examinations' }]}
    >
      {/* Server Time */}
      <div className="lms-info-box animate-fadeInDown" style={{ marginBottom: '16px' }}>
        <div className="lms-info-box-body">
          <div className="lms-info-row">
            <div className="lms-info-label">🕐 Server Time:</div>
            <div className="lms-info-value font-mono pulse-text">{format(serverTime, 'dd MMM yyyy, HH:mm:ss')}</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {examError && (
        <div className="lms-alert lms-alert-error animate-fadeIn" style={{ marginBottom: '16px' }}>
          <span className="section-icon">⚠️</span>
          <div>
            <div className="lms-alert-title">Failed to Load Examinations</div>
            <div>{examError}</div>
            <button 
              className="lms-btn lms-btn-sm" 
              style={{ marginTop: '8px' }}
              onClick={() => fetchAvailableExams()}
            >
              🔄 Retry
            </button>
          </div>
        </div>
      )}

      {/* Active Exams Alert */}
      {activeCount > 0 && (
        <div className="lms-alert lms-alert-warning live-exam-alert animate-pulse-border">
          <div className="live-indicator"></div>
          <div>
            <div className="lms-alert-title">🔴 EXAMINATIONS OPEN NOW</div>
            <div>{activeCount} examination(s) are currently open. Click &quot;Start&quot; to begin.</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <div className="lms-section-title"><span className="section-icon">🔍</span> Filter &amp; Search</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="lms-form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="lms-label" htmlFor="examSearch">Search</label>
            <input
              id="examSearch"
              type="text"
              className="lms-input"
              placeholder="Search by title or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="lms-form-group" style={{ margin: 0, width: '150px' }}>
            <label className="lms-label" htmlFor="statusFilter">Status</label>
            <select
              id="statusFilter"
              className="lms-select"
              title="Filter by status"
              value={filter}
              onChange={(e) => setFilter(e.target.value as ExamFilter)}
            >
              <option value="all">All</option>
              <option value="available">Open Now</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="ended">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">📚</div>
          <div className="lms-stat-value">{availableExams.length}</div>
          <div className="lms-stat-label">Total Exams</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon pulse-icon">🟢</div>
          <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{activeCount}</div>
          <div className="lms-stat-label">Open Now</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">✅</div>
          <div className="lms-stat-value">{completedCount}</div>
          <div className="lms-stat-label">Completed</div>
        </div>
      </div>

      {/* Exams Table */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="lms-section-title">
          <span className="section-icon">📋</span>
          {filter === 'all' ? 'All Examinations' : filter === 'available' ? 'Open Examinations' : filter === 'upcoming' ? 'Upcoming Examinations' : filter === 'completed' ? 'Completed Examinations' : 'Closed Examinations'}
        </div>

        {filteredExams.length === 0 ? (
          <div className="lms-table-empty empty-state-animated">
            <div className="empty-icon">📭</div>
            <div>No examinations found.</div>
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Exam Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Duration</th>
                  <th>Window Open</th>
                  <th>Window Close</th>
                  <th>Attempts</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.map((exam) => {
                  const statusDisplay = getStatusDisplay(exam);

                  return (
                    <tr key={exam._id}>
                      <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                      <td>{exam.title}</td>
                      <td>{exam.subject || '-'}</td>
                      <td>{exam.duration} min</td>
                      <td className="font-mono">{format(new Date(exam.startTime), 'dd/MM/yy HH:mm')}</td>
                      <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM/yy HH:mm')}</td>
                      <td>{exam.attemptCount || 0} / {exam.maxAttempts || 1}</td>
                      <td>
                        <span className={`lms-status ${statusDisplay.className}`}>
                          {statusDisplay.text}
                        </span>
                      </td>
                      <td>
                        {exam.status === 'completed' ? (
                          <Link href="/my/results" className="lms-btn lms-btn-sm">
                            View Result
                          </Link>
                        ) : exam.canStart ? (
                          <Link href={`/my/exams/${exam._id}`} className="lms-btn lms-btn-sm lms-btn-primary">
                            {exam.status === 'in-progress' ? 'Resume' : 'Start'}
                          </Link>
                        ) : (
                          <Link href={`/my/exams/${exam._id}`} className="lms-btn lms-btn-sm">
                            Details
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📖</span> Examination Guidelines
        </div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">1</span>Examinations can only be started during the specified time window.</li>
            <li className="guideline-item"><span className="guideline-icon idle">2</span>Once started, the examination must be completed within the allocated duration.</li>
            <li className="guideline-item"><span className="guideline-icon submit">3</span>Auto-submit will occur when time expires.</li>
            <li className="guideline-item"><span className="guideline-icon active">4</span>Ensure stable internet connection before starting.</li>
            <li className="guideline-item"><span className="guideline-icon violation">5</span>Do not switch tabs or windows during the examination — violations are logged.</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
