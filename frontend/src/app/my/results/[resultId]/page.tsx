'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { safeFormat } from '@/lib/dateUtils';
import toast from 'react-hot-toast';

interface ResultData {
  id: string;
  examId: string;
  examTitle: string;
  subject: string;
  duration: number;
  marksObtained: number;
  totalMarks: number;
  examTotalMarks: number;
  percentage: number;
  passingMarks: number;
  passingPercentage: number;
  passed: boolean;
  failReason?: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string;
  timeTaken: number;
  questionsAttempted: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalViolations: number;
  submissionType: string;
  canReview: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
}

interface QuestionReview {
  _id: string;
  questionText: string;
  questionType: string;
  options: { _id: string; text: string; isCorrect?: boolean }[];
  studentAnswer: string[];
  isCorrect: boolean;
  marksObtained: number;
  maxMarks: number;
  explanation?: string;
  timeTaken?: number;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
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

export default function ResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.resultId as string;

  const [result, setResult] = useState<ResultData | null>(null);
  const [questions, setQuestions] = useState<QuestionReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const response = await api.get(`/student/results/${resultId}`);
        const d = response.data.data;
        setResult(d.result);
        setQuestions(d.questions || []);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load result');
        router.push('/my/results');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
  }, [resultId, router]);

  const formatTime = (seconds: number) => {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const scrollToQuestion = (idx: number) => {
    setActiveTab('questions');
    setQuestionFilter('all');
    setTimeout(() => {
      questionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  if (isLoading || !result) {
    return (
      <LMSLayout
        pageTitle="Result Details"
        breadcrumbs={[{ label: 'Dashboard', href: '/my' }, { label: 'Results', href: '/my/results' }, { label: 'Loading...' }]}
      >
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading result details...</span>
        </div>
      </LMSLayout>
    );
  }

  const totalQuestions = questions.length || (result.correctAnswers + result.wrongAnswers);
  const unattempted = totalQuestions - result.questionsAttempted;

  // Build per-question status
  const questionStatuses = questions.map(q => {
    const isAttempted = (q.studentAnswer || []).length > 0;
    return { isAttempted, isCorrect: q.isCorrect };
  });
  const correctCount = questionStatuses.filter(s => s.isCorrect).length;
  const wrongCount = questionStatuses.filter(s => s.isAttempted && !s.isCorrect).length;
  const skippedCount = questionStatuses.filter(s => !s.isAttempted).length;

  const filteredQuestions = questions.map((q, i) => ({ q, i })).filter(({ q }) => {
    const isAttempted = (q.studentAnswer || []).length > 0;
    if (questionFilter === 'all') return true;
    if (questionFilter === 'correct') return q.isCorrect;
    if (questionFilter === 'wrong') return isAttempted && !q.isCorrect;
    if (questionFilter === 'skipped') return !isAttempted;
    return true;
  });

  return (
    <LMSLayout
      pageTitle={result.examTitle}
      breadcrumbs={[
        { label: 'Dashboard', href: '/my' },
        { label: 'Results', href: '/my/results' },
        { label: result.examTitle },
      ]}
    >
      {/* Result Banner */}
      <div
        className={`lms-alert ${result.passed ? 'lms-alert-success' : 'lms-alert-error'} animate-fadeIn`}
        style={{ textAlign: 'center' }}
      >
        <div className="lms-alert-title" style={{ fontSize: '20px' }}>
          {result.passed ? 'EXAMINATION PASSED' : 'EXAMINATION FAILED'}
        </div>
        {result.failReason && (
          <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.9 }}>
            Reason: {result.failReason}
          </div>
        )}
        <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0' }}>
          {result.marksObtained} / {result.totalMarks}
        </div>
        <div style={{ fontSize: '14px' }}>
          {Math.round(result.percentage)}% · Passing: {result.passingMarks} marks
        </div>
      </div>

      {/* Score Breakdown Cards */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
          <div className="lms-stat-value">{formatTime(result.timeTaken)}</div>
          <div className="lms-stat-label">Time Taken</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-value">{result.questionsAttempted}/{totalQuestions}</div>
          <div className="lms-stat-label">Attempted</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.12s' }}>
          <div className="lms-stat-value" style={{ color: 'var(--text-muted)' }}>{unattempted}</div>
          <div className="lms-stat-label">Unattempted</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{result.correctAnswers}</div>
          <div className="lms-stat-label">Correct</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-value" style={{ color: 'var(--danger)' }}>{result.wrongAnswers}</div>
          <div className="lms-stat-label">Wrong</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-value" style={{ color: result.totalViolations > 0 ? 'var(--danger)' : undefined }}>{result.totalViolations}</div>
          <div className="lms-stat-label">Violations</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        <button
          className={`lms-btn ${activeTab === 'overview' ? 'lms-btn-primary' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        {result.canReview && questions.length > 0 && (
          <button
            className={`lms-btn ${activeTab === 'questions' ? 'lms-btn-primary' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            Question Review ({questions.length})
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="lms-section-title">Exam Information</div>
            <div className="lms-table-container">
              <table className="lms-table">
                <tbody>
                  <tr><td style={{ width: '180px', fontWeight: 'bold' }}>Examination</td><td>{result.examTitle}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Subject</td><td>{result.subject || '—'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Attempt</td><td>#{result.attemptNumber}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Started</td><td style={{ fontFamily: 'monospace' }}>{safeFormat(result.startedAt, 'dd MMM yyyy HH:mm:ss')}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Submitted</td><td style={{ fontFamily: 'monospace' }}>{safeFormat(result.submittedAt, 'dd MMM yyyy HH:mm:ss')}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Time Taken</td><td>{formatTime(result.timeTaken)}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Submission Type</td><td>{
                    result.submissionType === 'auto-timeout' ? 'Auto-submit (timer expired)' :
                    result.submissionType === 'auto-violation' ? 'Auto-submit (max violations)' :
                    result.submissionType === 'admin-force' ? 'Force-submitted by admin' :
                    result.submissionType === 'auto' ? 'Auto-submit (timer expired)' :
                    result.submissionType === 'violation' ? 'Auto-submit (max violations)' :
                    'Manual submission'
                  }</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Violations</td><td style={{ color: result.totalViolations > 0 ? 'var(--danger)' : undefined }}>{result.totalViolations}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Summary */}
          <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.15s' }}>
            <div className="lms-section-title">Score Breakdown</div>
            <div style={{ padding: '20px' }}>
              {/* Score Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span>Score: {result.marksObtained}/{result.totalMarks}</span>
                  <span>{Math.round(result.percentage)}%</span>
                </div>
                <div style={{ background: 'var(--surface-hover)', borderRadius: '8px', height: '24px', overflow: 'hidden', position: 'relative' }}>
                  <div
                    style={{
                      width: `${Math.min(result.percentage, 100)}%`,
                      height: '100%',
                      background: result.passed
                        ? 'linear-gradient(90deg, var(--success), #34d399)'
                        : 'linear-gradient(90deg, var(--danger), #f87171)',
                      borderRadius: '8px',
                      transition: 'width 1s ease-out',
                    }}
                  />
                  {/* Passing mark indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.min(result.passingPercentage || 0, 100)}%`,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: 'var(--text-primary)',
                      opacity: 0.5,
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Passing: {Math.round(result.passingPercentage || 0)}%
                </div>
              </div>

              {/* Question breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{result.questionsAttempted}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attempted</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success)' }}>{result.correctAnswers}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Correct</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--danger)' }}>{result.wrongAnswers}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wrong</div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(249,115,22,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316' }}>{unattempted}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unattempted</div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Navigator Grid */}
          {result.canReview && questions.length > 0 && (
            <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <div className="lms-section-title">Question Navigator</div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {questions.map((q, idx) => {
                    const isAttempted = (q.studentAnswer || []).length > 0;
                    let bg = 'rgba(249,115,22,0.15)'; // orange for skipped
                    let color = '#f97316';
                    let border = 'rgba(249,115,22,0.3)';
                    if (q.isCorrect) { bg = 'rgba(34,197,94,0.15)'; color = '#16a34a'; border = 'rgba(34,197,94,0.3)'; }
                    else if (isAttempted) { bg = 'rgba(239,68,68,0.15)'; color = '#dc2626'; border = 'rgba(239,68,68,0.3)'; }
                    return (
                      <button
                        key={q._id}
                        onClick={() => scrollToQuestion(idx)}
                        style={{
                          width: '36px', height: '36px', borderRadius: '6px',
                          background: bg, color, border: `1px solid ${border}`,
                          fontWeight: 'bold', fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title={`Q${idx + 1}: ${q.isCorrect ? 'Correct' : isAttempted ? 'Wrong' : 'Not Attempted'}`}
                      >
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
      {activeTab === 'questions' && questions.length > 0 && (
        <div className="lms-section animate-fadeIn">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="lms-section-title" style={{ marginBottom: 0 }}>Question-by-Question Review</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { key: 'all' as const, label: `All (${questions.length})` },
                { key: 'correct' as const, label: `Correct (${correctCount})` },
                { key: 'wrong' as const, label: `Wrong (${wrongCount})` },
                { key: 'skipped' as const, label: `Skipped (${skippedCount})` },
              ].map(f => (
                <button key={f.key} className={`lms-btn lms-btn-sm ${questionFilter === f.key ? 'lms-btn-primary' : ''}`}
                  onClick={() => setQuestionFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px' }}>
            {filteredQuestions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No questions match this filter.</div>
            ) : filteredQuestions.map(({ q, i: index }) => {
              const studentAnswerIds = q.studentAnswer || [];
              const isAttempted = studentAnswerIds.length > 0;

              return (
                <div
                  key={q._id}
                  ref={el => { questionRefs.current[index] = el; }}
                  style={{
                    marginBottom: '16px',
                    border: `1px solid ${q.isCorrect ? 'rgba(34,197,94,0.3)' : isAttempted ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Question Header */}
                  <div
                    style={{
                      padding: '12px 16px',
                      background: q.isCorrect
                        ? 'rgba(34,197,94,0.08)'
                        : isAttempted
                        ? 'rgba(239,68,68,0.08)'
                        : 'rgba(249,115,22,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Q{index + 1}</span>
                      <span className={`lms-badge ${q.isCorrect ? 'lms-badge-success' : isAttempted ? 'lms-badge-danger' : 'lms-badge-warning'}`}>
                        {q.isCorrect ? 'Correct' : isAttempted ? 'Wrong' : 'Not Attempted'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {QUESTION_TYPE_LABELS[q.questionType] || q.questionType}
                      </span>
                      {q.timeTaken ? <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({formatTime(q.timeTaken)})</span> : null}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {q.marksObtained}/{q.maxMarks}
                    </span>
                  </div>

                  {/* Question Body */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.6' }}>
                      {q.questionText}
                    </div>

                    {/* Options for MCQ types */}
                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {q.options.map((opt, oi) => {
                          const isSelected = studentAnswerIds.includes(opt._id);
                          const isCorrectOption = result.showCorrectAnswers && opt.isCorrect;

                          let optionStyle: React.CSSProperties = {
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            transition: 'background 0.2s',
                          };

                          if (isSelected && q.isCorrect) {
                            optionStyle.background = 'rgba(34,197,94,0.1)';
                            optionStyle.borderColor = 'rgba(34,197,94,0.4)';
                          } else if (isSelected && !q.isCorrect) {
                            optionStyle.background = 'rgba(239,68,68,0.1)';
                            optionStyle.borderColor = 'rgba(239,68,68,0.4)';
                          } else if (isCorrectOption) {
                            optionStyle.background = 'rgba(34,197,94,0.05)';
                            optionStyle.borderColor = 'rgba(34,197,94,0.3)';
                          }

                          return (
                            <div key={opt._id} style={optionStyle}>
                              <span style={{ fontWeight: 'bold', minWidth: '20px', color: 'var(--text-muted)' }}>
                                {String.fromCharCode(65 + oi)}.
                              </span>
                              <span style={{ flex: 1 }}>{opt.text}</span>
                              <span style={{ fontSize: '11px', fontWeight: 600 }}>
                                {isSelected && q.isCorrect && <span style={{ color: '#16a34a' }}>(your answer - correct)</span>}
                                {isSelected && !q.isCorrect && <span style={{ color: '#dc2626' }}>(your answer)</span>}
                                {!isSelected && isCorrectOption && <span style={{ color: '#16a34a' }}>(correct answer)</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Not attempted indicator */}
                    {!isAttempted && (
                      <div style={{
                        marginTop: '8px', padding: '10px 14px',
                        background: 'rgba(249,115,22,0.06)', border: '1px dashed rgba(249,115,22,0.3)',
                        borderRadius: '6px', fontSize: '13px', color: '#f97316', fontStyle: 'italic',
                      }}>
                        You did not attempt this question
                      </div>
                    )}

                    {/* Legend for attempted */}
                    {isAttempted && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Your answer is highlighted
                        {result.showCorrectAnswers && !q.isCorrect && ' · Correct answer marked in green'}
                      </div>
                    )}

                    {/* Explanation */}
                    {result.showExplanations && q.explanation && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: 'rgba(59,130,246,0.05)',
                          border: '1px solid rgba(59,130,246,0.2)',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
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
        <Link href="/my/results" className="lms-btn" style={{ textDecoration: 'none' }}>← Back to Results</Link>
        <Link href="/my/exams" className="lms-btn" style={{ textDecoration: 'none' }}>Examinations</Link>
        <Link href="/my" className="lms-btn" style={{ textDecoration: 'none' }}>Dashboard</Link>
      </div>
    </LMSLayout>
  );
}
