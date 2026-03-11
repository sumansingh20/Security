'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { safeFormat } from '@/lib/dateUtils';

interface Result {
  _id: string;
  exam: { _id: string; title: string; subject?: string };
  student: { _id: string; firstName: string; lastName: string; studentId?: string; email?: string };
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  status: string;
  submittedAt: string;
  totalViolations: number;
  questionsAttempted?: number;
  totalQuestions?: number;
  submissionType?: string;
}

interface ExamInfo {
  _id: string;
  title: string;
  status?: string;
  subject?: string;
}

interface LiveSession {
  _id: string;
  student: { firstName: string; lastName: string; studentId?: string };
  questionsAnswered: number;
  totalQuestions: number;
  violationCount: number;
  timeRemaining: number;
  status: string;
}

export default function TeacherResultsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'teacher' && user?.role !== 'admin') { router.push('/my'); return; }
    const fetchExams = async () => {
      try {
        const res = await api.get('/teacher/exams');
        const examList = res.data.data?.exams || res.data.exams || [];
        setExams(examList);
        if (examList.length > 0) setSelectedExam(examList[0]._id);
      } catch { setLoading(false); }
    };
    fetchExams();
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!selectedExam) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/teacher/exams/${selectedExam}/results`);
        const data = res.data.data || {};
        setResults(data.results || data.submissions || res.data.results || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    };
    fetchResults();
  }, [selectedExam]);

  // Fetch live sessions for active exams  
  useEffect(() => {
    if (!selectedExam) return;
    const exam = exams.find(e => e._id === selectedExam);
    if (exam?.status === 'ongoing' || exam?.status === 'published') {
      setLiveLoading(true);
      const fetchLive = async () => {
        try {
          const res = await api.get('/teacher/monitor/sessions', { params: { examId: selectedExam } });
          const data = res.data.data?.sessions || res.data.data || [];
          setLiveSessions(Array.isArray(data) ? data : []);
        } catch { setLiveSessions([]); }
        finally { setLiveLoading(false); }
      };
      fetchLive();
      const interval = setInterval(fetchLive, 10000);
      return () => clearInterval(interval);
    } else {
      setLiveSessions([]);
    }
  }, [selectedExam, exams]);

  const selectedExamInfo = exams.find(e => e._id === selectedExam);
  const isExamLive = selectedExamInfo?.status === 'ongoing' || selectedExamInfo?.status === 'published';

  // Statistics
  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const passedCount = results.filter(r => r.passed || r.percentage >= 40).length;
    const failedCount = results.length - passedCount;
    const avgScore = Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length);
    const highestScore = Math.round(Math.max(...results.map(r => r.percentage || 0)));
    const lowestScore = Math.round(Math.min(...results.map(r => r.percentage || 0)));
    const totalViolations = results.reduce((s, r) => s + (r.totalViolations || 0), 0);
    return { total: results.length, passedCount, failedCount, avgScore, highestScore, lowestScore, totalViolations };
  }, [results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    let list = [...results];
    if (statusFilter === 'passed') list = list.filter(r => r.passed || r.percentage >= 40);
    if (statusFilter === 'failed') list = list.filter(r => !(r.passed || r.percentage >= 40));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.student?.firstName || '').toLowerCase().includes(q) ||
        (r.student?.lastName || '').toLowerCase().includes(q) ||
        (r.student?.studentId || '').toLowerCase().includes(q) ||
        (r.student?.email || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [results, statusFilter, search]);

  return (
    <LMSLayout pageTitle="Exam Results" breadcrumbs={[{ label: 'Teacher', href: '/teacher' }, { label: 'Results' }]}>
      {/* Exam Selection & Live Indicator */}
      <div className="lms-card" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="lms-label" style={{ marginBottom: '6px', display: 'block', fontSize: '13px', fontWeight: 600 }}>Select Exam</label>
            <select value={selectedExam} onChange={(e) => { setSelectedExam(e.target.value); setStatusFilter('all'); setSearch(''); }}
              className="lms-input" title="Select exam" style={{ width: '100%' }}>
              <option value="">Select an exam</option>
              {exams.map(e => (
                <option key={e._id} value={e._id}>
                  {e.title} {e.status === 'ongoing' ? ' [LIVE]' : e.status ? ` [${e.status}]` : ''}
                </option>
              ))}
            </select>
          </div>
          {isExamLive && (
            <Link href="/teacher/monitor" className="lms-btn lms-btn-primary" style={{ textDecoration: 'none', padding: '8px 16px', whiteSpace: 'nowrap' }}>
              Live Monitor ({liveSessions.length} online)
            </Link>
          )}
        </div>
      </div>

      {/* Live Sessions Banner */}
      {isExamLive && liveSessions.length > 0 && (
        <div className="lms-alert lms-alert-warning" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong>LIVE EXAM IN PROGRESS</strong> — {liveSessions.length} student(s) currently taking this exam
            </div>
            <Link href="/teacher/monitor" className="lms-btn lms-btn-sm lms-btn-primary" style={{ textDecoration: 'none' }}>
              Open Live Monitor →
            </Link>
          </div>
          {/* Quick live status */}
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {liveSessions.slice(0, 6).map((s) => (
              <div key={s._id} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div style={{ fontWeight: 600 }}>{s.student?.firstName} {s.student?.lastName}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: 'var(--text-muted)' }}>
                  <span>Progress: {s.questionsAnswered}/{s.totalQuestions}</span>
                  <span style={{ color: s.violationCount > 0 ? 'var(--danger)' : undefined }}>
                    Violations: {s.violationCount || 0}
                  </span>
                </div>
              </div>
            ))}
            {liveSessions.length > 6 && (
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                +{liveSessions.length - 6} more students...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="lms-stats-row monitor-stats" style={{ marginBottom: '16px' }}>
          <div className="lms-stat stat-card-monitor">
            <div className="lms-stat-value">{stats.total}</div>
            <div className="lms-stat-label">Total Submissions</div>
          </div>
          <div className="lms-stat stat-card-monitor">
            <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{stats.passedCount}</div>
            <div className="lms-stat-label">Passed</div>
          </div>
          <div className="lms-stat stat-card-monitor">
            <div className="lms-stat-value" style={{ color: 'var(--danger)' }}>{stats.failedCount}</div>
            <div className="lms-stat-label">Failed</div>
          </div>
          <div className="lms-stat stat-card-monitor">
            <div className="lms-stat-value">{stats.avgScore}%</div>
            <div className="lms-stat-label">Average Score</div>
          </div>
          <div className="lms-stat stat-card-monitor">
            <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{stats.highestScore}%</div>
            <div className="lms-stat-label">Highest</div>
          </div>
          <div className="lms-stat stat-card-monitor">
            <div className="lms-stat-value" style={{ color: 'var(--danger)' }}>{stats.lowestScore}%</div>
            <div className="lms-stat-label">Lowest</div>
          </div>
          <div className="lms-stat stat-card-monitor">
            <div className="lms-stat-value" style={{ color: stats.totalViolations > 0 ? 'var(--danger)' : undefined }}>{stats.totalViolations}</div>
            <div className="lms-stat-label">Total Violations</div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      {results.length > 0 && (
        <div className="lms-card" style={{ marginBottom: '16px', padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by student name, ID, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="lms-input"
              style={{ flex: 1, minWidth: '200px' }}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'passed', 'failed'].map(f => (
                <button key={f} className={`lms-btn lms-btn-sm ${statusFilter === f ? 'lms-btn-primary' : ''}`}
                  onClick={() => setStatusFilter(f)}>
                  {f === 'all' ? 'All' : f === 'passed' ? 'Passed' : 'Failed'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-animated">
            <div className="loading-spinner"></div>
            <span>Loading results...</span>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No results found for this exam.
          {isExamLive && <div style={{ marginTop: '8px' }}>Exam is currently live - results will appear as students submit.</div>}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No results match your search/filter.
        </div>
      ) : (
        <div className="lms-card" style={{ overflow: 'auto' }}>
          <table className="lms-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Student ID</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Result</th>
                <th>Status</th>
                <th>Violations</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r, idx) => {
                const isPassed = r.passed || r.percentage >= 40;
                return (
                  <tr key={r._id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.student?.firstName} {r.student?.lastName}</div>
                      {r.student?.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.student.email}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.student?.studentId || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{r.marksObtained}/{r.totalMarks}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', minWidth: '40px', maxWidth: '80px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(0, Math.min(r.percentage, 100))}%`, height: '100%', background: isPassed ? 'var(--success)' : 'var(--danger)', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{Math.max(0, Math.round(r.percentage))}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`lms-badge ${isPassed ? 'lms-badge-success' : 'lms-badge-danger'}`}>
                        {isPassed ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                    <td>
                      <span className={`lms-badge ${r.status === 'evaluated' ? 'lms-badge-success' : r.status === 'submitted' ? 'lms-badge-info' : 'lms-badge-warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ color: (r.totalViolations || 0) > 0 ? 'var(--danger)' : undefined, fontWeight: (r.totalViolations || 0) > 3 ? 'bold' : undefined }}>
                      {r.totalViolations || 0}
                    </td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{safeFormat(r.submittedAt, 'dd MMM yyyy HH:mm')}</td>
                    <td>
                      <button onClick={() => router.push(`/teacher/results/${r._id}`)}
                        className="lms-btn lms-btn-sm lms-btn-primary" style={{ fontSize: '12px' }}>
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </LMSLayout>
  );
}
