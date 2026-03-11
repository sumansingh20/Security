'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { safeFormat } from '@/lib/dateUtils';

interface Answer {
  question: {
    _id: string;
    questionText: string;
    questionType: string;
    marks: number;
    negativeMarks?: number;
    options?: { _id: string; text: string; isCorrect: boolean }[];
    correctAnswer?: any;
    explanation?: string;
    imageUrl?: string;
    blanks?: { position: number; acceptedAnswers: string[] }[];
    matchPairs?: { left: string; right: string }[];
    correctOrder?: string[];
  };
  selectedOptions?: string[];
  textAnswer?: string;
  isCorrect: boolean | null;
  marksObtained: number;
  visited: boolean;
  timeTaken?: number;
  markedForReview?: boolean;
}

interface SubmissionDetail {
  _id: string;
  exam: {
    _id: string;
    title: string;
    subject?: string;
    totalMarks: number;
    passingMarks: number;
    duration?: number;
    negativeMarking?: boolean;
  };
  student: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
    studentId?: string;
    rollNumber?: string;
  };
  answers: Answer[];
  marksObtained: number;
  score?: number;
  totalMarks: number;
  percentage: number;
  status: string;
  passed?: boolean;
  isPassed?: boolean;
  startedAt?: string;
  startTime?: string;
  submittedAt?: string;
  submitTime?: string;
  timeTaken?: number;
  timeSpent?: number;
  totalViolations?: number;
  questionsAttempted?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  submissionType?: string;
  violations?: { type: string; timestamp: string; details?: string }[];
  attemptNumber: number;
}

const TYPE_LABELS: Record<string, string> = {
  'mcq-single': 'Single Choice',
  'mcq-multiple': 'Multiple Choice',
  'true-false': 'True / False',
  'fill-blank': 'Fill in the Blank',
  'numerical': 'Numerical',
  'short-answer': 'Short Answer',
  'long-answer': 'Long Answer',
  'matching': 'Matching',
  'ordering': 'Ordering',
  'image-based': 'Image Based',
  'code': 'Code',
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const examId = params.examId as string;
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');
  const [showViolations, setShowViolations] = useState(false);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const response = await api.get(`/admin/submissions/${submissionId}`);
        setSubmission(response.data.data.submission);
      } catch (error) {
        console.error('Failed to fetch submission:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmission();
  }, [submissionId]);

  const fmtTime = (sec?: number) => {
    if (!sec || sec <= 0) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (isLoading) {
    return (
      <LMSLayout breadcrumbs={[{ label: 'Administration', href: '/admin/dashboard' }, { label: 'Examinations', href: '/admin/exams' }, { label: 'Loading...' }]}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div className="spinner" />
        </div>
      </LMSLayout>
    );
  }

  if (!submission) {
    return (
      <LMSLayout breadcrumbs={[{ label: 'Administration', href: '/admin/dashboard' }, { label: 'Examinations', href: '/admin/exams' }, { label: 'Not Found' }]}>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <p style={{ fontSize: '1rem' }}>Submission not found.</p>
          <Link href={`/admin/exams/${examId}/results`} style={{ color: '#3b82f6', fontSize: '0.8125rem' }}>
            ← Back to Results
          </Link>
        </div>
      </LMSLayout>
    );
  }

  const studentName = submission.student.firstName
    ? `${submission.student.firstName} ${submission.student.lastName || ''}`.trim()
    : submission.student.name || 'Unknown Student';
  const score = submission.marksObtained ?? submission.score ?? 0;
  const totalMarks = submission.totalMarks || submission.exam.totalMarks || 0;
  const pct = submission.percentage ?? (totalMarks > 0 ? (score / totalMarks) * 100 : 0);
  const passed = submission.passed ?? submission.isPassed ?? (score >= (submission.exam.passingMarks || 0));
  const startedAt = submission.startedAt || submission.startTime;
  const submittedAt = submission.submittedAt || submission.submitTime;
  const timeTaken = submission.timeTaken || submission.timeSpent || 0;
  const violations = submission.violations || [];
  const totalViolations = submission.totalViolations || violations.length;

  const answers = submission.answers || [];
  const totalQ = answers.length;
  const attempted = answers.filter(a => (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer).length;
  const correct = answers.filter(a => a.isCorrect === true).length;
  const wrong = answers.filter(a => {
    const isAtt = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
    return isAtt && a.isCorrect === false;
  }).length;
  const skipped = totalQ - attempted;
  const negativeTotal = answers.reduce((sum, a) => a.marksObtained < 0 ? sum + a.marksObtained : sum, 0);

  const filtered = answers.filter(a => {
    const isAtt = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
    if (filter === 'correct') return a.isCorrect === true;
    if (filter === 'wrong') return isAtt && a.isCorrect === false;
    if (filter === 'skipped') return !isAtt;
    return true;
  });

  const submissionLabel = submission.submissionType === 'auto-timeout' ? 'Auto (timeout)' : submission.submissionType === 'auto-violation' ? 'Auto (violation)' : submission.submissionType === 'admin-force' ? 'Force-submitted' : 'Manual';

  return (
    <LMSLayout
      breadcrumbs={[
        { label: 'Administration', href: '/admin/dashboard' },
        { label: 'Examinations', href: '/admin/exams' },
        { label: submission.exam.title || 'Exam', href: `/admin/exams/${examId}` },
        { label: 'Results', href: `/admin/exams/${examId}/results` },
        { label: studentName },
      ]}
    >
      {/* Back link */}
      <div style={{ marginBottom: 16 }}>
        <Link href={`/admin/exams/${examId}/results`} style={{ color: '#3b82f6', fontSize: '0.8125rem', textDecoration: 'none' }}>
          ← Back to Results
        </Link>
      </div>

      {/* Result Header */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 20, overflow: 'hidden',
      }}>
        <div style={{
          borderLeft: `4px solid ${passed ? '#22c55e' : '#ef4444'}`,
          padding: '20px 24px',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
              {submission.exam.title}
            </h1>
            {submission.exam.subject && (
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{submission.exam.subject}</span>
            )}
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
              Attempt #{submission.attemptNumber} &middot; {studentName}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: 9999,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              background: passed ? '#dcfce7' : '#fee2e2',
              color: passed ? '#15803d' : '#dc2626',
              marginBottom: 6,
            }}>
              {passed ? 'PASSED' : 'FAILED'}
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {score}<span style={{ fontSize: '1rem', fontWeight: 400, color: '#94a3b8' }}>/{totalMarks}</span>
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: passed ? '#16a34a' : '#dc2626' }}>
              {Math.round(pct * 10) / 10}%
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="lms-stats-row" style={{ marginBottom: 20 }}>
        {[
          { v: totalQ, l: 'Questions' },
          { v: attempted, l: 'Attempted' },
          { v: correct, l: 'Correct', c: '#16a34a' },
          { v: wrong, l: 'Wrong', c: '#dc2626' },
          { v: skipped, l: 'Skipped', c: '#f59e0b' },
          { v: `${Math.round(pct)}%`, l: 'Score', c: passed ? '#16a34a' : '#dc2626' },
          { v: fmtTime(timeTaken), l: 'Time' },
          { v: totalViolations, l: 'Violations', c: totalViolations > 0 ? '#dc2626' : undefined },
        ].map((s, i) => (
          <div key={i} className="lms-stat">
            <div className="lms-stat-value" style={s.c ? { color: s.c } : undefined}>{s.v}</div>
            <div className="lms-stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* Left column */}
        <div>
          {/* Question Map */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', marginBottom: 10 }}>
              Question Map
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {answers.map((a, idx) => {
                const isAtt = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
                let bg = '#fef3c7'; let c = '#d97706'; let bdr = '#fde68a';
                if (a.isCorrect === true) { bg = '#dcfce7'; c = '#16a34a'; bdr = '#bbf7d0'; }
                else if (isAtt) { bg = '#fee2e2'; c = '#dc2626'; bdr = '#fecaca'; }
                return (
                  <div key={idx} title={`Q${idx+1}: ${a.marksObtained}/${a.question?.marks||0}`} style={{
                    width: 38, height: 38, borderRadius: 6, border: `1px solid ${bdr}`, background: bg, color: c,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.1, cursor: 'default',
                  }}>
                    <span>{idx + 1}</span>
                    {a.marksObtained !== 0 && (
                      <span style={{ fontSize: 9, opacity: 0.8 }}>{a.marksObtained > 0 ? `+${a.marksObtained}` : a.marksObtained}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '0.6875rem', color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#bbf7d0', display: 'inline-block' }} /> Correct</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#fecaca', display: 'inline-block' }} /> Wrong</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#fde68a', display: 'inline-block' }} /> Skipped</span>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {([
              { key: 'all' as const, label: `All (${totalQ})` },
              { key: 'correct' as const, label: `Correct (${correct})` },
              { key: 'wrong' as const, label: `Wrong (${wrong})` },
              { key: 'skipped' as const, label: `Skipped (${skipped})` },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                  border: filter === f.key ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                  background: filter === f.key ? '#3b82f6' : '#fff',
                  color: filter === f.key ? '#fff' : '#475569',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                No questions match this filter.
              </div>
            ) : filtered.map((answer) => {
              const q = answer.question;
              if (!q) return null;
              const isAtt = (answer.selectedOptions && answer.selectedOptions.length > 0) || !!answer.textAnswer;
              const studentOpts = answer.selectedOptions || [];
              const qNum = answers.indexOf(answer) + 1;

              let accent = '#f59e0b'; let accentBg = '#fffbeb'; let statusText = 'Skipped';
              if (answer.isCorrect === true) { accent = '#16a34a'; accentBg = '#f0fdf4'; statusText = 'Correct'; }
              else if (isAtt) { accent = '#dc2626'; accentBg = '#fef2f2'; statusText = 'Wrong'; }

              return (
                <div key={q._id || qNum} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Question header bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                    padding: '10px 16px', background: accentBg, borderBottom: `1px solid #e2e8f0`,
                    borderLeft: `3px solid ${accent}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%', background: accent, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        {qNum}
                      </span>
                      <span style={{
                        fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: '#f1f5f9', color: '#475569',
                      }}>
                        {TYPE_LABELS[q.questionType] || (q.questionType || '').replace(/-/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: accent }}>
                        {statusText}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {answer.timeTaken ? (
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{fmtTime(answer.timeTaken)}</span>
                      ) : null}
                      <span style={{
                        fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'monospace',
                        color: answer.marksObtained > 0 ? '#16a34a' : answer.marksObtained < 0 ? '#dc2626' : '#94a3b8',
                      }}>
                        {answer.marksObtained > 0 ? '+' : ''}{answer.marksObtained}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}> / {q.marks}</span>
                      </span>
                    </div>
                  </div>

                  {/* Question body */}
                  <div style={{ padding: '14px 16px' }}>
                    <p style={{ fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                      {q.questionText}
                    </p>

                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Question" style={{ maxWidth: 400, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 12 }} />
                    )}

                    {/* Options */}
                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {q.options.map((opt, oi) => {
                          const isSel = studentOpts.includes(opt._id);
                          const isCor = opt.isCorrect;
                          let bg = '#fff'; let bdr = '#e2e8f0'; let bdrStyle = 'solid';
                          if (isSel && isCor) { bg = '#f0fdf4'; bdr = '#86efac'; }
                          else if (isSel && !isCor) { bg = '#fef2f2'; bdr = '#fca5a5'; }
                          else if (isCor) { bg = '#f0fdf4'; bdr = '#86efac'; bdrStyle = 'dashed'; }
                          return (
                            <div key={opt._id || oi} style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                              border: `1.5px ${bdrStyle} ${bdr}`, borderRadius: 6, background: bg,
                            }}>
                              <span style={{
                                width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', flexShrink: 0,
                              }}>
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span style={{ flex: 1, fontSize: '0.8125rem', color: '#334155' }}>{opt.text}</span>
                              {isSel && isCor && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#16a34a' }}>✓ Your Answer</span>}
                              {isSel && !isCor && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#dc2626' }}>✗ Your Answer</span>}
                              {!isSel && isCor && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#16a34a' }}>Correct</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Text answer */}
                    {answer.textAnswer && (
                      <div style={{
                        marginTop: 10, padding: '10px 14px', borderRadius: 6,
                        border: `1px solid ${answer.isCorrect ? '#bbf7d0' : '#fecaca'}`,
                        background: answer.isCorrect ? '#f0fdf4' : '#fef2f2',
                      }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8', marginBottom: 4 }}>Student&apos;s Answer</div>
                        <div style={{ fontSize: '0.8125rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                          {typeof answer.textAnswer === 'string' ? answer.textAnswer : JSON.stringify(answer.textAnswer)}
                        </div>
                      </div>
                    )}

                    {/* Correct answer */}
                    {q.correctAnswer !== undefined && q.correctAnswer !== null && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#16a34a', marginBottom: 4 }}>Correct Answer</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#15803d' }}>
                          {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                        </div>
                      </div>
                    )}

                    {/* Match pairs */}
                    {q.matchPairs && q.matchPairs.length > 0 && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#16a34a', marginBottom: 6 }}>Correct Matches</div>
                        {q.matchPairs.map((pair, pi) => (
                          <div key={pi} style={{ fontSize: '0.8125rem', color: '#334155', marginBottom: 2 }}>
                            <strong>{pair.left}</strong> <span style={{ color: '#94a3b8' }}>→</span> {pair.right}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Correct order */}
                    {q.correctOrder && q.correctOrder.length > 0 && (
                      <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#16a34a', marginBottom: 6 }}>Correct Order</div>
                        <ol style={{ margin: 0, paddingLeft: 20, fontSize: '0.8125rem', color: '#334155' }}>
                          {q.correctOrder.map((item, oi) => <li key={oi}>{item}</li>)}
                        </ol>
                      </div>
                    )}

                    {/* Not attempted */}
                    {!isAtt && (
                      <div style={{
                        marginTop: 10, padding: '12px 14px', borderRadius: 6,
                        border: '1.5px dashed #fde68a', background: '#fffbeb', textAlign: 'center',
                        fontSize: '0.8125rem', color: '#d97706', fontStyle: 'italic',
                      }}>
                        Not attempted
                      </div>
                    )}

                    {/* Negative marks */}
                    {answer.marksObtained < 0 && q.negativeMarks && (
                      <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#dc2626' }}>
                        ⚠ Negative marking: −{q.negativeMarks} for wrong answer
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff' }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#2563eb', marginBottom: 4 }}>Explanation</div>
                        <p style={{ fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.6, margin: 0 }}>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Student info */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' }}>
              Student Information
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', fontWeight: 700, color: '#4f46e5',
                }}>
                  {(studentName.charAt(0) || '?').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{studentName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{submission.student.email}</div>
                </div>
              </div>
              {(submission.student.rollNumber || submission.student.studentId) && (
                <div style={{ fontSize: '0.8125rem', color: '#64748b', fontFamily: 'monospace' }}>
                  {submission.student.rollNumber || submission.student.studentId}
                </div>
              )}
            </div>
          </div>

          {/* Score summary */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' }}>
              Score Summary
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: passed ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
                  {score}<span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#cbd5e1' }}>/{totalMarks}</span>
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: passed ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                  {Math.round(pct * 10) / 10}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ position: 'relative', width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, marginBottom: 4 }}>
                <div style={{
                  height: 8, borderRadius: 4,
                  background: passed ? '#22c55e' : '#ef4444',
                  width: `${Math.max(0, Math.min(pct, 100))}%`,
                  transition: 'width 0.6s ease',
                }} />
                {submission.exam.passingMarks > 0 && totalMarks > 0 && (
                  <div style={{
                    position: 'absolute', top: -2, bottom: -2, width: 2, background: '#64748b', borderRadius: 1,
                    left: `${(submission.exam.passingMarks / totalMarks) * 100}%`,
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: '#94a3b8', marginBottom: 14 }}>
                <span>0</span>
                <span>Pass: {submission.exam.passingMarks}</span>
                <span>{totalMarks}</span>
              </div>

              {negativeTotal < 0 && (
                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#dc2626', background: '#fef2f2', borderRadius: 6, padding: '6px 0', marginBottom: 12 }}>
                  Negative: {negativeTotal.toFixed(1)}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '8px 0' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#16a34a' }}>{correct}</div>
                  <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Correct</div>
                </div>
                <div style={{ background: '#fef2f2', borderRadius: 6, padding: '8px 0' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#dc2626' }}>{wrong}</div>
                  <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Wrong</div>
                </div>
                <div style={{ background: '#fffbeb', borderRadius: 6, padding: '8px 0' }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#d97706' }}>{skipped}</div>
                  <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>Skipped</div>
                </div>
              </div>
            </div>
          </div>

          {/* Attempt details */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b' }}>
              Attempt Details
            </div>
            <div style={{ padding: 16 }}>
              {[
                { l: 'Started', v: startedAt ? safeFormat(startedAt, 'dd MMM yyyy, HH:mm') : '—' },
                { l: 'Submitted', v: submittedAt ? safeFormat(submittedAt, 'dd MMM yyyy, HH:mm') : '—' },
                { l: 'Duration', v: submission.exam.duration ? `${submission.exam.duration} min` : '—' },
                { l: 'Time Spent', v: fmtTime(timeTaken) },
                { l: 'Submission', v: submissionLabel },
              ].map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none',
                  fontSize: '0.8125rem',
                }}>
                  <span style={{ color: '#94a3b8' }}>{r.l}</span>
                  <span style={{ fontWeight: 500, color: '#334155', textAlign: 'right' }}>{r.v}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0 0', borderTop: '1px solid #e2e8f0', marginTop: 6, fontSize: '0.8125rem',
              }}>
                <span style={{ color: '#94a3b8' }}>Status</span>
                <span className="lms-status" style={{
                  background: submission.status === 'evaluated' ? '#dcfce7' : submission.status === 'submitted' ? '#dbeafe' : '#f1f5f9',
                  color: submission.status === 'evaluated' ? '#15803d' : submission.status === 'submitted' ? '#1d4ed8' : '#475569',
                }}>
                  {(submission.status || '').replace(/-/g, ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Violations */}
          {totalViolations > 0 && (
            <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setShowViolations(!showViolations)}
                style={{
                  width: '100%', padding: '10px 16px', background: '#fef2f2', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#dc2626',
                }}
              >
                <span>⚠ Violations ({totalViolations})</span>
                <span>{showViolations ? '▲' : '▼'}</span>
              </button>
              {showViolations && violations.length > 0 && (
                <div style={{ padding: 12, maxHeight: 200, overflowY: 'auto' }}>
                  {violations.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: '0.8125rem' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', marginTop: 6, flexShrink: 0 }} />
                      <div>
                        <div style={{ color: '#334155', fontWeight: 500 }}>{(v.type || '').replace(/_|-/g, ' ')}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{safeFormat(v.timestamp, 'HH:mm:ss')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Responsive: stack on smaller screens */}
      <style>{`
        @media (max-width: 900px) {
          .lms-main > div:last-child > div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </LMSLayout>
  );
}
