'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { safeFormat } from '@/lib/dateUtils';

interface ResultDetail {
  _id: string;
  student: { firstName: string; lastName: string; studentId?: string; email: string };
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
  answers: {
    question: {
      _id: string;
      questionText: string;
      questionType: string;
      marks: number;
      options?: { _id: string; text: string; isCorrect: boolean }[];
      correctAnswer?: string | number;
      explanation?: string;
    };
    selectedOptions?: string[];
    textAnswer?: string;
    isCorrect: boolean;
    marksObtained: number;
    visited: boolean;
    timeTaken?: number;
  }[];
}

const TYPE_LABELS: Record<string, string> = {
  'mcq-single': 'Single Choice', 'mcq-multiple': 'Multiple Choice', 'true-false': 'True/False',
  'fill-blank': 'Fill Blank', 'numerical': 'Numerical', 'short-answer': 'Short Answer',
  'long-answer': 'Long Answer', 'matching': 'Matching', 'ordering': 'Ordering',
  'image-based': 'Image Based', 'code': 'Code',
};

export default function AdminResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await api.get(`/admin/submissions/${resultId}`);
        setResult(res.data.data?.submission || res.data.submission || res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load result');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
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
      <LMSLayout pageTitle="Submission Detail" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Results', href: '/admin/results' }, { label: 'Loading...' }]}>
        <div className="loading-animated"><div className="loading-spinner"></div><span>Loading submission...</span></div>
      </LMSLayout>
    );
  }

  if (error || !result) {
    return (
      <LMSLayout pageTitle="Submission Detail" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Results', href: '/admin/results' }, { label: 'Error' }]}>
        <div className="lms-alert lms-alert-error">{error || 'Submission not found'}</div>
        <Link href="/admin/results" className="lms-btn" style={{ textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>← Back to Results</Link>
      </LMSLayout>
    );
  }

  const passed = result.passed ?? (result.percentage >= ((result.exam?.passingMarks || 40) / (result.exam?.totalMarks || 100) * 100));
  const answers = result.answers || [];
  const totalQ = answers.length || result.totalQuestions || 0;
  const attempted = answers.filter(a => (a.selectedOptions && a.selectedOptions.length > 0) || a.textAnswer).length || result.questionsAttempted || 0;
  const correct = answers.filter(a => a.isCorrect).length || result.correctAnswers || 0;
  const wrong = attempted - correct;
  const skipped = totalQ - attempted;

  const filteredAnswers = answers.filter(a => {
    const isAttempted = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
    if (questionFilter === 'all') return true;
    if (questionFilter === 'correct') return a.isCorrect;
    if (questionFilter === 'wrong') return isAttempted && !a.isCorrect;
    if (questionFilter === 'skipped') return !isAttempted;
    return true;
  });

  return (
    <LMSLayout
      pageTitle="Submission Detail"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Results', href: '/admin/results' },
        { label: `${result.student?.firstName} ${result.student?.lastName}` },
      ]}
    >
      {/* Result Banner */}
      <div className={`lms-alert ${passed ? 'lms-alert-success' : 'lms-alert-error'}`} style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700 }}>{passed ? 'PASSED' : 'FAILED'}</div>
        <div style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>{result.marksObtained} / {result.totalMarks}</div>
        <div style={{ fontSize: '14px' }}>{Math.round(result.percentage)}%</div>
      </div>

      {/* Stats Row */}
      <div className="lms-stats-row monitor-stats" style={{ marginBottom: '16px' }}>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value">{result.student?.firstName} {result.student?.lastName}</div>
          <div className="lms-stat-label">{result.student?.email}</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value">{attempted}/{totalQ}</div>
          <div className="lms-stat-label">Attempted</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value" style={{ color: '#f97316' }}>{skipped}</div>
          <div className="lms-stat-label">Unattempted</div>
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
          <div className="lms-stat-value">{formatTime(result.timeTaken)}</div>
          <div className="lms-stat-label">Time Taken</div>
        </div>
        <div className="lms-stat stat-card-monitor">
          <div className="lms-stat-value" style={{ color: result.totalViolations > 0 ? 'var(--danger)' : undefined }}>{result.totalViolations}</div>
          <div className="lms-stat-label">Violations</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        <button className={`lms-btn ${activeTab === 'overview' ? 'lms-btn-primary' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        {answers.length > 0 && (
          <button className={`lms-btn ${activeTab === 'questions' ? 'lms-btn-primary' : ''}`} onClick={() => setActiveTab('questions')}>
            Question Review ({totalQ})
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="lms-section">
            <div className="lms-section-title">Submission Details</div>
            <div className="lms-table-container">
              <table className="lms-table">
                <tbody>
                  <tr><td style={{ width: '180px', fontWeight: 'bold' }}>Student</td><td>{result.student?.firstName} {result.student?.lastName}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Email</td><td>{result.student?.email}</td></tr>
                  {result.student?.studentId && <tr><td style={{ fontWeight: 'bold' }}>Student ID</td><td style={{ fontFamily: 'monospace' }}>{result.student.studentId}</td></tr>}
                  <tr><td style={{ fontWeight: 'bold' }}>Exam</td><td>{result.exam?.title}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Subject</td><td>{result.exam?.subject || '—'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Duration</td><td>{result.exam?.duration} min</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Started</td><td style={{ fontFamily: 'monospace' }}>{safeFormat(result.startedAt, 'dd MMM yyyy HH:mm:ss')}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Submitted</td><td style={{ fontFamily: 'monospace' }}>{safeFormat(result.submittedAt, 'dd MMM yyyy HH:mm:ss')}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Time Taken</td><td>{formatTime(result.timeTaken)}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Submission Type</td><td>{
                    result.submissionType === 'auto-timeout' ? 'Auto-submit (timer expired)' :
                    result.submissionType === 'auto-violation' ? 'Auto-submit (violations)' :
                    result.submissionType === 'admin-force' ? 'Force-submitted' :
                    result.submissionType === 'auto' ? 'Auto-submit (timer expired)' :
                    'Manual submission'
                  }</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Status</td><td><span className={`lms-badge ${result.status === 'evaluated' ? 'lms-badge-success' : 'lms-badge-info'}`}>{result.status}</span></td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Violations</td><td style={{ color: result.totalViolations > 0 ? 'var(--danger)' : undefined }}>{result.totalViolations}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Visual */}
          <div className="lms-section">
            <div className="lms-section-title">Score Breakdown</div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span>Score: {result.marksObtained}/{result.totalMarks}</span>
                  <span>{Math.round(result.percentage)}%</span>
                </div>
                <div style={{ background: 'var(--surface-hover)', borderRadius: '8px', height: '24px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(result.percentage, 100)}%`, height: '100%', background: passed ? 'linear-gradient(90deg, var(--success), #34d399)' : 'linear-gradient(90deg, var(--danger), #f87171)', borderRadius: '8px', transition: 'width 1s ease-out' }} />
                </div>
              </div>
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
                <div style={{ padding: '12px', background: 'rgba(249,115,22,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316' }}>{skipped}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unattempted</div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          {answers.length > 0 && (
            <div className="lms-section">
              <div className="lms-section-title">Question Navigator</div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {answers.map((a, idx) => {
                    const isAtt = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
                    let bg = 'rgba(249,115,22,0.15)'; let color = '#f97316'; let border = 'rgba(249,115,22,0.3)';
                    if (a.isCorrect) { bg = 'rgba(34,197,94,0.15)'; color = '#16a34a'; border = 'rgba(34,197,94,0.3)'; }
                    else if (isAtt) { bg = 'rgba(239,68,68,0.15)'; color = '#dc2626'; border = 'rgba(239,68,68,0.3)'; }
                    return (
                      <button key={idx} onClick={() => { setActiveTab('questions'); setQuestionFilter('all'); }}
                        style={{ width: '36px', height: '36px', borderRadius: '6px', background: bg, color, border: `1px solid ${border}`, fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={`Q${idx + 1}: ${a.isCorrect ? 'Correct' : isAtt ? 'Wrong' : 'Not Attempted'}`}>
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(34,197,94,0.4)', marginRight: '4px' }} />Correct</span>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(239,68,68,0.4)', marginRight: '4px' }} />Wrong</span>
                  <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(249,115,22,0.4)', marginRight: '4px' }} />Not Attempted</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && answers.length > 0 && (
        <div className="lms-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="lms-section-title" style={{ marginBottom: 0 }}>Question-by-Question Review</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { key: 'all' as const, label: `All (${totalQ})` },
                { key: 'correct' as const, label: `Correct (${correct})` },
                { key: 'wrong' as const, label: `Wrong (${wrong})` },
                { key: 'skipped' as const, label: `Skipped (${skipped})` },
              ].map(f => (
                <button key={f.key} className={`lms-btn lms-btn-sm ${questionFilter === f.key ? 'lms-btn-primary' : ''}`}
                  onClick={() => setQuestionFilter(f.key)}>
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
                  marginBottom: '16px',
                  border: `1px solid ${answer.isCorrect ? 'rgba(34,197,94,0.3)' : isAttempted ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`,
                  borderRadius: '8px', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '10px 16px',
                    background: answer.isCorrect ? 'rgba(34,197,94,0.08)' : isAttempted ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Q{answers.indexOf(answer) + 1}</span>
                      <span className={`lms-badge ${answer.isCorrect ? 'lms-badge-success' : isAttempted ? 'lms-badge-danger' : 'lms-badge-warning'}`}>
                        {answer.isCorrect ? 'Correct' : isAttempted ? 'Wrong' : 'Not Attempted'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{TYPE_LABELS[q.questionType] || q.questionType}</span>
                      {answer.timeTaken ? <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({formatTime(answer.timeTaken)})</span> : null}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>{answer.marksObtained}/{q.marks}</span>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.6' }}>{q.questionText}</div>

                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {q.options.map((opt, oi) => {
                          const isSelected = studentAnswerIds.includes(opt._id);
                          const isCorrectOpt = opt.isCorrect;
                          let bg = 'transparent'; let borderColor = 'var(--border)';
                          if (isSelected && answer.isCorrect) { bg = 'rgba(34,197,94,0.1)'; borderColor = 'rgba(34,197,94,0.4)'; }
                          else if (isSelected && !answer.isCorrect) { bg = 'rgba(239,68,68,0.1)'; borderColor = 'rgba(239,68,68,0.4)'; }
                          else if (isCorrectOpt) { bg = 'rgba(34,197,94,0.05)'; borderColor = 'rgba(34,197,94,0.3)'; }
                          return (
                            <div key={opt._id || oi} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderColor}`, background: bg, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 'bold', minWidth: '20px', color: 'var(--text-muted)' }}>{String.fromCharCode(65 + oi)}.</span>
                              <span style={{ flex: 1 }}>{opt.text}</span>
                              {isSelected && <span style={{ fontSize: '11px', fontWeight: 600, color: answer.isCorrect ? '#16a34a' : '#dc2626' }}>(selected)</span>}
                              {isCorrectOpt && !isSelected && <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a' }}>(correct)</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {answer.textAnswer && (
                      <div style={{ marginTop: '8px', padding: '10px', background: 'var(--surface-hover)', borderRadius: '6px', fontSize: '13px' }}>
                        <strong>Student&apos;s Answer:</strong>
                        <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>{answer.textAnswer}</div>
                      </div>
                    )}

                    {q.correctAnswer !== undefined && q.correctAnswer !== null && !q.options?.length && (
                      <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '6px', fontSize: '13px' }}>
                        <strong>Correct Answer:</strong> {String(q.correctAnswer)}
                      </div>
                    )}

                    {!isAttempted && (
                      <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(249,115,22,0.06)', border: '1px dashed rgba(249,115,22,0.3)', borderRadius: '6px', fontSize: '13px', color: '#f97316', fontStyle: 'italic' }}>
                        Student did not attempt this question
                      </div>
                    )}

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
        <Link href="/admin/results" className="lms-btn" style={{ textDecoration: 'none' }}>← Back to Results</Link>
        {result.exam?._id && <Link href={`/admin/results/${resultId}/grade`} className="lms-btn lms-btn-primary" style={{ textDecoration: 'none' }}>Grade</Link>}
        <Link href="/admin" className="lms-btn" style={{ textDecoration: 'none' }}>Dashboard</Link>
      </div>
    </LMSLayout>
  );
}
