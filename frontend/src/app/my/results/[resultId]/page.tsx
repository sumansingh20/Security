'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ResultData {
  id: string;
  examId: string;
  examTitle: string;
  subject: string;
  duration: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  passingMarks: number;
  passed: boolean;
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

export default function ResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.resultId as string;

  const [result, setResult] = useState<ResultData | null>(null);
  const [questions, setQuestions] = useState<QuestionReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions'>('overview');

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

  const totalQuestions = questions.length || (result.correctAnswers + result.wrongAnswers + (result.questionsAttempted ? 0 : 0));
  const unattempted = totalQuestions - result.questionsAttempted;

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
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>{result.passed ? '🎉' : '😔'}</div>
        <div className="lms-alert-title" style={{ fontSize: '20px' }}>
          {result.passed ? 'EXAMINATION PASSED' : 'EXAMINATION FAILED'}
        </div>
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
          <div className="lms-stat-icon">⏱️</div>
          <div className="lms-stat-value">{formatTime(result.timeTaken)}</div>
          <div className="lms-stat-label">Time Taken</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-icon">📝</div>
          <div className="lms-stat-value">{result.questionsAttempted}/{totalQuestions}</div>
          <div className="lms-stat-label">Attempted</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">✅</div>
          <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{result.correctAnswers}</div>
          <div className="lms-stat-label">Correct</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon">❌</div>
          <div className="lms-stat-value" style={{ color: 'var(--danger)' }}>{result.wrongAnswers}</div>
          <div className="lms-stat-label">Wrong</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">⚠️</div>
          <div className="lms-stat-value">{result.totalViolations}</div>
          <div className="lms-stat-label">Violations</div>
        </div>
      </div>

      {/* Tabs */}
      {result.canReview && questions.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          <button
            className={`lms-btn ${activeTab === 'overview' ? 'lms-btn-primary' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`lms-btn ${activeTab === 'questions' ? 'lms-btn-primary' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            📋 Question Review ({questions.length})
          </button>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="lms-section-title"><span className="section-icon">📄</span> Exam Information</div>
            <div className="lms-table-container">
              <table className="lms-table">
                <tbody>
                  <tr><td style={{ width: '180px', fontWeight: 'bold' }}>Examination</td><td>{result.examTitle}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Subject</td><td>{result.subject || '—'}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Attempt</td><td>#{result.attemptNumber}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Started</td><td className="font-mono">{format(new Date(result.startedAt), 'dd MMM yyyy HH:mm:ss')}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Submitted</td><td className="font-mono">{format(new Date(result.submittedAt), 'dd MMM yyyy HH:mm:ss')}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Time Taken</td><td>{formatTime(result.timeTaken)}</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Submission Type</td><td>{
                    result.submissionType === 'auto-timeout' ? '⏰ Auto-submit (timer expired)' :
                    result.submissionType === 'auto-violation' ? '⚠️ Auto-submit (max violations)' :
                    result.submissionType === 'admin-force' ? '🔒 Force-submitted by admin' :
                    result.submissionType === 'auto' ? '⏰ Auto-submit (timer expired)' :
                    result.submissionType === 'violation' ? '⚠️ Auto-submit (max violations)' :
                    '✅ Manual submission'
                  }</td></tr>
                  <tr><td style={{ fontWeight: 'bold' }}>Violations</td><td>{result.totalViolations}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Summary */}
          <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.15s' }}>
            <div className="lms-section-title"><span className="section-icon">🏆</span> Score Breakdown</div>
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
                      left: `${(result.passingMarks / result.totalMarks) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: 'var(--text-primary)',
                      opacity: 0.5,
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Passing mark: {result.passingMarks} ({Math.round((result.passingMarks / result.totalMarks) * 100)}%)
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
                <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{unattempted}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unattempted</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && questions.length > 0 && (
        <div className="lms-section animate-fadeIn">
          <div className="lms-section-title"><span className="section-icon">📋</span> Question-by-Question Review</div>
          <div style={{ padding: '16px' }}>
            {questions.map((q, index) => {
              const studentAnswerIds = q.studentAnswer || [];
              const isAttempted = studentAnswerIds.length > 0;

              return (
                <div
                  key={q._id}
                  style={{
                    marginBottom: '16px',
                    border: `1px solid ${q.isCorrect ? 'rgba(34,197,94,0.3)' : isAttempted ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
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
                        : 'var(--surface-hover)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Q{index + 1}</span>
                      <span className={`lms-badge ${q.isCorrect ? 'lms-badge-success' : isAttempted ? 'lms-badge-danger' : 'lms-badge-warning'}`}>
                        {q.isCorrect ? '✅ Correct' : isAttempted ? '❌ Wrong' : '⚪ Skipped'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {q.questionType === 'mcq-single' && 'Single Choice'}
                        {q.questionType === 'mcq-multiple' && 'Multiple Choice'}
                        {q.questionType === 'true-false' && 'True/False'}
                      </span>
                    </div>
                    <span className="font-mono" style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {q.marksObtained}/{q.maxMarks}
                    </span>
                  </div>

                  {/* Question Body */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.6' }}>
                      {q.questionText}
                    </div>

                    {/* Options */}
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
                            <span style={{ fontSize: '14px' }}>
                              {isSelected && q.isCorrect && '✅'}
                              {isSelected && !q.isCorrect && '❌'}
                              {!isSelected && isCorrectOption && '✓'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    {isAttempted && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        • Your answer is highlighted
                        {result.showCorrectAnswers && !q.isCorrect && ' • Correct answer shown with ✓'}
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
                        <strong>💡 Explanation:</strong>
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
        <Link href="/my/results" className="lms-btn">← Back to Results</Link>
        <Link href="/my/exams" className="lms-btn">Examinations</Link>
        <Link href="/my" className="lms-btn">Dashboard</Link>
      </div>
    </LMSLayout>
  );
}
