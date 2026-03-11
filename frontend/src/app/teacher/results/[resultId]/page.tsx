'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { safeFormat } from '@/lib/dateUtils';
import toast from 'react-hot-toast';

interface SubmissionDetail {
  _id: string;
  student: { firstName: string; lastName: string; email: string; studentId?: string };
  exam: { _id: string; title: string; subject?: string; totalMarks: number; passingMarks: number; duration: number };
  status: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  questionsAttempted: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  submittedAt: string;
  startedAt: string;
  timeTaken: number;
  totalViolations: number;
  submissionType: string;
  answers: AnswerDetail[];
}

interface AnswerDetail {
  question: {
    _id: string;
    questionText: string;
    questionType: string;
    marks: number;
    options?: { _id: string; text: string; isCorrect: boolean }[];
    correctAnswer?: string | number;
    correctOptions?: string[];
    explanation?: string;
  };
  questionId: string;
  selectedOptions?: string[];
  textAnswer?: string;
  isCorrect: boolean;
  marksObtained: number;
  visited: boolean;
  timeTaken?: number;
}

export default function TeacherResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.resultId as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/teacher/submissions/${resultId}`);
        const data = res.data.data?.submission || res.data.submission || res.data.data;
        setSubmission(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [resultId]);

  const formatTime = (seconds: number) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <LMSLayout pageTitle="Submission Review" breadcrumbs={[{ label: 'Teacher', href: '/teacher' }, { label: 'Results', href: '/teacher/results' }, { label: 'Loading...' }]}>
        <div className="loading-animated"><div className="loading-spinner"></div><span>Loading submission...</span></div>
      </LMSLayout>
    );
  }

  if (error || !submission) {
    return (
      <LMSLayout pageTitle="Submission Review" breadcrumbs={[{ label: 'Teacher', href: '/teacher' }, { label: 'Results', href: '/teacher/results' }, { label: 'Error' }]}>
        <div className="lms-alert lms-alert-error">{error || 'Submission not found'}</div>
        <Link href="/teacher/results" className="lms-btn" style={{ textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>← Back to Results</Link>
      </LMSLayout>
    );
  }

  const answers = submission.answers || [];
  const totalQ = answers.length || submission.totalQuestions || 0;
  const attempted = answers.filter(a => (a.selectedOptions && a.selectedOptions.length > 0) || a.textAnswer).length;
  const correct = answers.filter(a => a.isCorrect).length;
  const wrong = attempted - correct;
  const skipped = totalQ - attempted;
  const passed = submission.passed || submission.percentage >= 40;

  const filteredAnswers = answers.filter(a => {
    if (questionFilter === 'all') return true;
    const isAttempted = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
    if (questionFilter === 'correct') return a.isCorrect;
    if (questionFilter === 'wrong') return isAttempted && !a.isCorrect;
    if (questionFilter === 'skipped') return !isAttempted;
    return true;
  });

  return (
    <LMSLayout
      pageTitle="Submission Review"
      breadcrumbs={[
        { label: 'Teacher', href: '/teacher' },
        { label: 'Results', href: '/teacher/results' },
        { label: `${submission.student?.firstName} ${submission.student?.lastName}` },
      ]}
    >
      {/* Result Banner */}
      <div className={`lms-alert ${passed ? 'lms-alert-success' : 'lms-alert-error'}`} style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700 }}>{passed ? 'PASSED' : 'FAILED'}</div>
        <div style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>{submission.marksObtained} / {submission.totalMarks}</div>
        <div style={{ fontSize: '14px' }}>{Math.round(submission.percentage)}%</div>
      </div>

      {/* Student Info & Stats */}
      <div className="lms-stats-row monitor-stats" style={{ marginBottom: '16px' }}>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value">{submission.student?.firstName} {submission.student?.lastName}</div>
          <div className="lms-stat-label">{submission.student?.email}</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value">{attempted}/{totalQ}</div>
          <div className="lms-stat-label">Attempted</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{correct}</div>
          <div className="lms-stat-label">Correct</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value" style={{ color: 'var(--danger)' }}>{wrong}</div>
          <div className="lms-stat-label">Wrong</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value" style={{ color: 'var(--text-muted)' }}>{skipped}</div>
          <div className="lms-stat-label">Skipped</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value">{formatTime(submission.timeTaken)}</div>
          <div className="lms-stat-label">Time Taken</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value" style={{ color: submission.totalViolations > 0 ? 'var(--danger)' : undefined }}>{submission.totalViolations}</div>
          <div className="lms-stat-label">Violations</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        <button className={`lms-btn ${activeTab === 'overview' ? 'lms-btn-primary' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`lms-btn ${activeTab === 'questions' ? 'lms-btn-primary' : ''}`} onClick={() => setActiveTab('questions')}>
          Question Review ({totalQ})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="lms-section">
          <div className="lms-section-title">Submission Details</div>
          <div className="lms-table-container">
            <table className="lms-table">
              <tbody>
                <tr><td style={{ width: '180px', fontWeight: 'bold' }}>Student</td><td>{submission.student?.firstName} {submission.student?.lastName}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Email</td><td>{submission.student?.email}</td></tr>
                {submission.student?.studentId && <tr><td style={{ fontWeight: 'bold' }}>Student ID</td><td style={{ fontFamily: 'monospace' }}>{submission.student.studentId}</td></tr>}
                <tr><td style={{ fontWeight: 'bold' }}>Exam</td><td>{submission.exam?.title}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Subject</td><td>{submission.exam?.subject || '—'}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Started</td><td style={{ fontFamily: 'monospace' }}>{safeFormat(submission.startedAt, 'dd MMM yyyy HH:mm:ss')}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Submitted</td><td style={{ fontFamily: 'monospace' }}>{safeFormat(submission.submittedAt, 'dd MMM yyyy HH:mm:ss')}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Time Taken</td><td>{formatTime(submission.timeTaken)}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Submission Type</td><td>{
                  submission.submissionType === 'auto-timeout' ? 'Auto-submit (timer expired)' :
                  submission.submissionType === 'auto-violation' ? 'Auto-submit (violations)' :
                  submission.submissionType === 'admin-force' ? 'Force-submitted' :
                  submission.submissionType === 'auto' ? 'Auto-submit (timer expired)' :
                  'Manual submission'
                }</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Status</td><td><span className={`lms-badge ${submission.status === 'evaluated' ? 'lms-badge-success' : 'lms-badge-info'}`}>{submission.status}</span></td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Violations</td><td style={{ color: submission.totalViolations > 0 ? 'var(--danger)' : undefined }}>{submission.totalViolations}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Score Visual */}
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span>Score: {submission.marksObtained}/{submission.totalMarks}</span>
                <span>{Math.round(submission.percentage)}%</span>
              </div>
              <div style={{ background: 'var(--surface-hover)', borderRadius: '8px', height: '24px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(submission.percentage, 100)}%`, height: '100%', background: passed ? 'linear-gradient(90deg, var(--success), #34d399)' : 'linear-gradient(90deg, var(--danger), #f87171)', borderRadius: '8px', transition: 'width 1s ease-out' }} />
              </div>
            </div>
            {/* Question breakdown visual */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{attempted}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attempted</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)' }}>{correct}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Correct</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--danger)' }}>{wrong}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wrong</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{skipped}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Skipped</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="lms-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="lms-section-title" style={{ marginBottom: 0 }}>Question-by-Question Review</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { key: 'all', label: `All (${totalQ})` },
                { key: 'correct', label: `Correct (${correct})` },
                { key: 'wrong', label: `Wrong (${wrong})` },
                { key: 'skipped', label: `Skipped (${skipped})` },
              ].map(f => (
                <button key={f.key} className={`lms-btn lms-btn-sm ${questionFilter === f.key ? 'lms-btn-primary' : ''}`}
                  onClick={() => setQuestionFilter(f.key as any)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            {filteredAnswers.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No questions match this filter.</div>
            ) : filteredAnswers.map((answer, idx) => {
              const q = answer.question;
              if (!q) return null;
              const isAttempted = (answer.selectedOptions && answer.selectedOptions.length > 0) || !!answer.textAnswer;
              const studentAnswerIds = answer.selectedOptions || [];

              return (
                <div key={q._id || idx} style={{
                  marginBottom: '16px', border: `1px solid ${answer.isCorrect ? 'rgba(34,197,94,0.3)' : isAttempted ? 'rgba(239,68,68,0.3)' : 'rgba(156,163,175,0.3)'}`,
                  borderRadius: '8px', overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '10px 16px',
                    background: answer.isCorrect ? 'rgba(34,197,94,0.08)' : isAttempted ? 'rgba(239,68,68,0.08)' : 'var(--surface-hover)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Q{answers.indexOf(answer) + 1}</span>
                      <span className={`lms-badge ${answer.isCorrect ? 'lms-badge-success' : isAttempted ? 'lms-badge-danger' : 'lms-badge-warning'}`}>
                        {answer.isCorrect ? 'Correct' : isAttempted ? 'Wrong' : 'Skipped'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{q.questionType}</span>
                      {answer.timeTaken ? <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({formatTime(answer.timeTaken)})</span> : null}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>{answer.marksObtained}/{q.marks}</span>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.6' }}>{q.questionText}</div>

                    {/* Options for MCQ */}
                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {q.options.map((opt, oi) => {
                          const isSelected = studentAnswerIds.includes(opt._id);
                          const isCorrectOption = opt.isCorrect;
                          let bg = 'transparent';
                          let borderColor = 'var(--border)';
                          if (isSelected && answer.isCorrect) { bg = 'rgba(34,197,94,0.1)'; borderColor = 'rgba(34,197,94,0.4)'; }
                          else if (isSelected && !answer.isCorrect) { bg = 'rgba(239,68,68,0.1)'; borderColor = 'rgba(239,68,68,0.4)'; }
                          else if (isCorrectOption) { bg = 'rgba(34,197,94,0.05)'; borderColor = 'rgba(34,197,94,0.3)'; }

                          return (
                            <div key={opt._id || oi} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderColor}`, background: bg, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 'bold', minWidth: '20px', color: 'var(--text-muted)' }}>{String.fromCharCode(65 + oi)}.</span>
                              <span style={{ flex: 1 }}>{opt.text}</span>
                              {isSelected && <span style={{ fontSize: '11px', fontWeight: 600, color: answer.isCorrect ? '#16a34a' : '#dc2626' }}>(selected)</span>}
                              {isCorrectOption && !isSelected && <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a' }}>(correct)</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Text Answer */}
                    {answer.textAnswer && (
                      <div style={{ marginTop: '8px', padding: '10px', background: 'var(--surface-hover)', borderRadius: '6px', fontSize: '13px' }}>
                        <strong>Student&apos;s Answer:</strong>
                        <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{answer.textAnswer}</div>
                      </div>
                    )}

                    {/* Correct Answer for non-MCQ */}
                    {q.correctAnswer !== undefined && q.correctAnswer !== null && !q.options?.length && (
                      <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', fontSize: '13px' }}>
                        <strong>Correct Answer:</strong> {String(q.correctAnswer)}
                      </div>
                    )}

                    {/* Not attempted indicator */}
                    {!isAttempted && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(156,163,175,0.1)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Student did not attempt this question
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', fontSize: '12px' }}>
                        <strong>Explanation:</strong>
                        <div style={{ marginTop: '4px', lineHeight: '1.6' }}>{q.explanation}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '20px 0' }}>
        <Link href="/teacher/results" className="lms-btn" style={{ textDecoration: 'none' }}>← Back to Results</Link>
        <Link href="/teacher/monitor" className="lms-btn" style={{ textDecoration: 'none' }}>Live Monitor</Link>
        <Link href="/teacher" className="lms-btn" style={{ textDecoration: 'none' }}>Dashboard</Link>
      </div>
    </LMSLayout>
  );
}
