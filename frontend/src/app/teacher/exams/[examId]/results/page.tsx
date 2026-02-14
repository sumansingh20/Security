'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Submission {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    email: string;
    rollNumber?: string;
  };
  attemptNumber: number;
  startedAt: string;
  submittedAt: string;
  status: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  questionsAttempted: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalViolations: number;
  timeTaken: number;
}

interface ExamInfo {
  _id: string;
  title: string;
  subject: string;
  status: string;
  totalMarks: number;
  passingMarks: number;
  duration: number;
}

interface Analytics {
  totalSubmissions: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  averageTime: number;
  scoreDistribution: Array<{ range: string; count: number }>;
}

export default function TeacherResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user, isAuthenticated } = useAuthStore();

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    sort: 'submittedAt',
    order: 'desc',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push('/my');
      return;
    }
  }, [isAuthenticated, user, router]);

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { 
        page, 
        limit: 50,
        sort: filters.sort,
        order: filters.order,
      };
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const [submissionsRes, analyticsRes] = await Promise.all([
        api.get(`/teacher/exams/${examId}/submissions`, { params }),
        api.get(`/teacher/exams/${examId}/analytics`),
      ]);
      
      setExam(submissionsRes.data.data.exam || null);
      setSubmissions(submissionsRes.data.data.submissions || []);
      setTotalPages(submissionsRes.data.data.pagination?.pages || 1);
      setAnalytics(analyticsRes.data.data || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load results');
      toast.error('Failed to load results');
    } finally {
      setIsLoading(false);
    }
  }, [examId, page, filters]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const response = await api.get(`/teacher/exams/${examId}/export`, {
        params: { format },
        responseType: format === 'csv' ? 'blob' : 'json',
      });
      
      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `results_${examId}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const blob = new Blob([JSON.stringify(response.data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `results_${examId}_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'submitted': return 'lms-status-success';
      case 'auto-submitted': return 'lms-status-info';
      case 'force-submitted': return 'lms-status-closed';
      case 'violation-submitted': return 'lms-status-draft';
      default: return '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading && submissions.length === 0) {
    return (
      <LMSLayout pageTitle="Exam Results" breadcrumbs={[{ label: 'Loading...' }]}>
        <div className="lms-loading">Loading results...</div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Exam Results"
      breadcrumbs={[
        { label: 'Teacher Dashboard', href: '/teacher' },
        { label: 'Examinations' },
        { label: exam?.title || 'Exam' },
        { label: 'Results' },
      ]}
    >
      {error && (
        <div className="lms-alert lms-alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Exam Info */}
      {exam && (
        <div className="lms-info-box" style={{ marginBottom: '16px' }}>
          <div className="lms-info-box-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong>{exam.title}</strong>
                <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                  {exam.subject}
                </span>
              </div>
              <div>
                <span className="lms-info-label">Total Marks:</span> {exam.totalMarks} |{' '}
                <span className="lms-info-label">Passing:</span> {exam.passingMarks} |{' '}
                <span className="lms-info-label">Duration:</span> {exam.duration} min
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Summary */}
      {analytics && (
        <div className="lms-stats-row" style={{ marginBottom: '16px' }}>
          <div className="lms-stat">
            <div className="lms-stat-value">{analytics.totalSubmissions}</div>
            <div className="lms-stat-label">Total Submissions</div>
          </div>
          <div className="lms-stat">
            <div className="lms-stat-value">{analytics.averageScore.toFixed(1)}%</div>
            <div className="lms-stat-label">Average Score</div>
          </div>
          <div className="lms-stat">
            <div className="lms-stat-value" style={{ color: analytics.passRate >= 50 ? 'var(--success)' : 'var(--error)' }}>
              {analytics.passRate.toFixed(1)}%
            </div>
            <div className="lms-stat-label">Pass Rate</div>
          </div>
          <div className="lms-stat">
            <div className="lms-stat-value">{analytics.highestScore}%</div>
            <div className="lms-stat-label">Highest</div>
          </div>
          <div className="lms-stat">
            <div className="lms-stat-value">{analytics.lowestScore}%</div>
            <div className="lms-stat-label">Lowest</div>
          </div>
        </div>
      )}

      {/* Filters and Export */}
      <div className="lms-section" style={{ marginBottom: '16px' }}>
        <div className="lms-section-title">Filters & Export</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="lms-select"
            title="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="auto-submitted">Auto-Submitted</option>
            <option value="force-submitted">Force-Submitted</option>
            <option value="violation-submitted">Violation-Submitted</option>
          </select>

          <select
            value={`${filters.sort}-${filters.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-');
              setFilters({ ...filters, sort, order });
            }}
            className="lms-select"
            title="Sort results"
          >
            <option value="submittedAt-desc">Submitted (Latest)</option>
            <option value="submittedAt-asc">Submitted (Earliest)</option>
            <option value="marksObtained-desc">Score (Highest)</option>
            <option value="marksObtained-asc">Score (Lowest)</option>
          </select>

          <input
            type="text"
            placeholder="Search student ID or name..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="lms-input"
            style={{ minWidth: '200px' }}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleExport('csv')} 
              className="lms-btn lms-btn-primary"
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button 
              onClick={() => handleExport('json')} 
              className="lms-btn"
              disabled={exporting}
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="lms-section">
        <div className="lms-section-title">Submissions ({submissions.length})</div>

        {submissions.length === 0 ? (
          <div className="lms-table-empty">
            No submissions found for this examination.
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Attempt</th>
                  <th>Submitted At</th>
                  <th>Time Taken</th>
                  <th>Score</th>
                  <th>%</th>
                  <th>Result</th>
                  <th>Violations</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const passed = exam && sub.marksObtained >= exam.passingMarks;
                  return (
                    <tr key={sub._id}>
                      <td className="font-mono">{sub.student?.rollNumber || '-'}</td>
                      <td className="font-mono">{sub.student?.studentId || '-'}</td>
                      <td>
                        {sub.student
                          ? `${sub.student.firstName} ${sub.student.lastName}`
                          : 'Unknown'}
                      </td>
                      <td>{sub.attemptNumber}</td>
                      <td className="font-mono" style={{ fontSize: '11px' }}>
                        {format(new Date(sub.submittedAt), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td>{formatTime(sub.timeTaken)}</td>
                      <td>
                        <strong>{sub.marksObtained}</strong> / {sub.totalMarks}
                      </td>
                      <td style={{ color: sub.percentage >= 60 ? 'var(--success)' : sub.percentage >= 40 ? 'var(--warning)' : 'var(--error)' }}>
                        {sub.percentage.toFixed(1)}%
                      </td>
                      <td>
                        <span className={`lms-status ${passed ? 'lms-status-success' : 'lms-status-draft'}`}>
                          {passed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td style={{ color: sub.totalViolations > 0 ? 'var(--error)' : undefined }}>
                        {sub.totalViolations}
                      </td>
                      <td>
                        <span className={`lms-status ${getStatusClass(sub.status)}`}>
                          {sub.status.replace(/-/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/teacher/exams/${examId}/submissions/${sub._id}`}
                          className="lms-btn lms-btn-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="lms-pagination" style={{ marginTop: '16px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="lms-btn lms-btn-sm"
            >
              Previous
            </button>
            <span style={{ padding: '0 12px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="lms-btn lms-btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        <Link href={`/teacher/exams/${examId}/monitor`} className="lms-btn">
          ← Back to Monitor
        </Link>
        <Link href={`/teacher/exams/${examId}/violations`} className="lms-btn">
          View Violations
        </Link>
      </div>
    </LMSLayout>
  );
}
