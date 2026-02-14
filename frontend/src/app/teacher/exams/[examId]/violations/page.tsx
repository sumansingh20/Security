'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Violation {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    email: string;
  };
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress: string;
  timestamp: string;
  actionTaken?: string;
  metadata?: {
    userAgent?: string;
    screenResolution?: string;
    [key: string]: any;
  };
}

interface ExamInfo {
  _id: string;
  title: string;
  status: string;
}

interface ViolationSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  studentsWithViolations: number;
}

export default function TeacherViolationsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user, isAuthenticated } = useAuthStore();

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [summary, setSummary] = useState<ViolationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    severity: 'all',
    type: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  const fetchViolations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: 50 };
      if (filters.severity !== 'all') params.severity = filters.severity;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.search) params.search = filters.search;

      const response = await api.get(`/teacher/exams/${examId}/violations`, { params });
      
      setExam(response.data.data.exam || null);
      setViolations(response.data.data.violations || []);
      setSummary(response.data.data.summary || null);
      setTotalPages(response.data.data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load violations');
      toast.error('Failed to load violations');
    } finally {
      setIsLoading(false);
    }
  }, [examId, page, filters]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'lms-status-closed';
      case 'high': return 'lms-status-draft';
      case 'medium': return 'lms-status-info';
      default: return '';
    }
  };

  const getViolationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'tab-switch': 'Tab Switch',
      'window-blur': 'Window Blur',
      'copy-attempt': 'Copy Attempt',
      'paste-attempt': 'Paste Attempt',
      'multiple-tabs': 'Multiple Tabs',
      'screenshot-attempt': 'Screenshot',
      'print-attempt': 'Print Attempt',
      'devtools-open': 'DevTools Open',
      'right-click': 'Right Click',
      'keyboard-shortcut': 'Keyboard Shortcut',
      'fullscreen-exit': 'Fullscreen Exit',
    };
    return labels[type] || type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/teacher/exams/${examId}/violations/export`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `violations_${examId}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (isLoading && violations.length === 0) {
    return (
      <LMSLayout pageTitle="Violation Logs" breadcrumbs={[{ label: 'Loading...' }]}>
        <div className="lms-loading">Loading violation data...</div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Violation Logs"
      breadcrumbs={[
        { label: 'Teacher Dashboard', href: '/teacher' },
        { label: 'Examinations' },
        { label: exam?.title || 'Exam' },
        { label: 'Violations' },
      ]}
    >
      {error && (
        <div className="lms-alert lms-alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="lms-stats-row" style={{ marginBottom: '16px' }}>
          <div className="lms-stat">
            <div className="lms-stat-value" style={{ color: 'var(--error)' }}>
              {summary.total}
            </div>
            <div className="lms-stat-label">Total Violations</div>
          </div>
          <div className="lms-stat">
            <div className="lms-stat-value">{summary.studentsWithViolations}</div>
            <div className="lms-stat-label">Students Involved</div>
          </div>
          <div className="lms-stat">
            <div className="lms-stat-value" style={{ color: 'var(--error)' }}>
              {summary.bySeverity?.critical || 0}
            </div>
            <div className="lms-stat-label">Critical</div>
          </div>
          <div className="lms-stat">
            <div className="lms-stat-value" style={{ color: 'var(--warning)' }}>
              {summary.bySeverity?.high || 0}
            </div>
            <div className="lms-stat-label">High</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="lms-section" style={{ marginBottom: '16px' }}>
        <div className="lms-section-title">Filters</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            className="lms-select"
            title="Filter by severity"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="lms-select"
            title="Filter by violation type"
          >
            <option value="all">All Types</option>
            <option value="tab-switch">Tab Switch</option>
            <option value="window-blur">Window Blur</option>
            <option value="copy-attempt">Copy Attempt</option>
            <option value="paste-attempt">Paste Attempt</option>
            <option value="devtools-open">DevTools</option>
            <option value="fullscreen-exit">Fullscreen Exit</option>
          </select>

          <input
            type="text"
            placeholder="Search student ID or name..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="lms-input"
            style={{ minWidth: '200px' }}
          />

          <button onClick={handleExport} className="lms-btn lms-btn-primary">
            Export CSV
          </button>
        </div>
      </div>

      {/* Violations Table */}
      <div className="lms-section">
        <div className="lms-section-title">Violation Log ({violations.length})</div>

        {violations.length === 0 ? (
          <div className="lms-table-empty">
            No violations recorded for this examination.
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Violation Type</th>
                  <th>Severity</th>
                  <th>IP Address</th>
                  <th>Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((violation) => (
                  <tr key={violation._id}>
                    <td className="font-mono" style={{ fontSize: '11px' }}>
                      {format(new Date(violation.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="font-mono">
                      {violation.student?.studentId || 'N/A'}
                    </td>
                    <td>
                      {violation.student
                        ? `${violation.student.firstName} ${violation.student.lastName}`
                        : 'Unknown'}
                    </td>
                    <td>{getViolationTypeLabel(violation.type)}</td>
                    <td>
                      <span className={`lms-status ${getSeverityClass(violation.severity)}`}>
                        {violation.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px' }}>
                      {violation.ipAddress || 'N/A'}
                    </td>
                    <td>
                      {violation.actionTaken || (
                        <span style={{ color: 'var(--text-muted)' }}>None</span>
                      )}
                    </td>
                  </tr>
                ))}
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

      {/* Back Link */}
      <div style={{ marginTop: '24px' }}>
        <Link href={`/teacher/exams/${examId}/monitor`} className="lms-btn">
          ← Back to Exam Monitor
        </Link>
      </div>
    </LMSLayout>
  );
}
