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
  exam: { _id: string; title: string; subject?: string; totalMarks: number; passingMarks: number; duration: number; negativeMarking?: boolean };
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
      negativeMarks?: number;
      options?: { _id: string; text: string; isCorrect: boolean }[];
      correctAnswer?: string | number;
      explanation?: string;
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
  const correct = answers.filter(a => a.isCorrect === true).length || result.correctAnswers || 0;
  const wrong = answers.filter(a => {
    const isAtt = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
    return isAtt && a.isCorrect === false;
  }).length || result.wrongAnswers || 0;
  const skipped = totalQ - attempted;

  // Calculate negative marks total
  const negativeTotal = answers.reduce((sum, a) => {
    if (a.marksObtained < 0) return sum + a.marksObtained;
    return sum;
  }, 0);
  const positiveTotal = answers.reduce((sum, a) => {
    if (a.marksObtained > 0) return sum + a.marksObtained;
    return sum;
  }, 0);

  const filteredAnswers = answers.filter(a => {
    const isAttempted = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
    if (questionFilter === 'all') return true;
    if (questionFilter === 'correct') return a.isCorrect === true;
    if (questionFilter === 'wrong') return isAttempted && a.isCorrect === false;
    if (questionFilter === 'skipped') return !isAttempted;
    return true;
  });

  const examDuration = result.exam?.duration;
  const durationDisplay = examDuration ? `${examDuration} min` : '—';

  return (
    <LMSLayout
      pageTitle="Submission Review"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Results', href: '/admin/results' },
        { label: `${result.student?.firstName || ''} ${result.student?.lastName || ''}`.trim() || 'Student' },
      ]}
    >
      {/* Result Banner */}
      <div style={{
        background: passed
          ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)'
          : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(220,38,38,0.08) 100%)',
        border: `2px solid ${passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        borderRadius: '12px', textAlign: 'center', padding: '24px', marginBottom: '20px',
      }}>
        <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600, color: passed ? '#16a34a' : '#dc2626', marginBottom: '4px' }}>
          {passed ? '✓ PASSED' : '✗ FAILED'}
        </div>
        <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)', margin: '4px 0' }}>
          {result.marksObtained ?? 0} <span style={{ fontSize: '18px', fontWeight: 400, color: 'var(--text-muted)' }}>/ {result.totalMarks}</span>
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: passed ? '#16a34a' : '#dc2626' }}>
          {Math.round(result.percentage ?? 0)}%
        </div>
        {negativeTotal < 0 && (
          <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
            Negative marks: {negativeTotal.toFixed(1)}
          </div>
        )}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Passing: {result.exam?.passingMarks || 0} marks
        </div>
      </div>

      {/* Student & Exam Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Student Card */}
        <div className="lms-section" style={{ margin: 0 }}>
          <div className="lms-section-title" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Student Info</div>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
              {result.student?.firstName} {result.student?.lastName}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '2px' }}>{result.student?.email}</div>
            {result.student?.studentId && (
              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>ID: {result.student.studentId}</div>
            )}
          </div>
        </div>

        {/* Exam Card */}
        <div className="lms-section" style={{ margin: 0 }}>
          <div className="lms-section-title" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Exam Info</div>
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{result.exam?.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '2px' }}>{result.exam?.subject || '—'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Duration: {durationDisplay} | Total: {result.totalMarks} marks</div>
          </div>
        </div>

        {/* Timing Card */}
        <div className="lms-section" style={{ margin: 0 }}>
          <div className="lms-section-title" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Timing</div>
          <div style={{ padding: '12px 16px', fontSize: '13px' }}>
            <div style={{ marginBottom: '4px' }}><strong>Started:</strong> {safeFormat(result.startedAt, 'dd MMM yyyy HH:mm')}</div>
            <div style={{ marginBottom: '4px' }}><strong>Submitted:</strong> {safeFormat(result.submittedAt, 'dd MMM yyyy HH:mm')}</div>
            <div><strong>Time Taken:</strong> {formatTime(result.timeTaken)}</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Attempted', value: `${attempted}/${totalQ}`, color: 'var(--text)' },
          { label: 'Correct', value: correct, color: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Wrong', value: wrong, color: '#dc2626', bg: 'rgba(239,68,68,0.08)' },
          { label: 'Skipped', value: skipped, color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
          { label: 'Earned', value: `+${positiveTotal.toFixed(1)}`, color: '#16a34a', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Deducted', value: negativeTotal < 0 ? negativeTotal.toFixed(1) : '0', color: negativeTotal < 0 ? '#dc2626' : 'var(--text-muted)', bg: negativeTotal < 0 ? 'rgba(239,68,68,0.08)' : undefined },
          { label: 'Violations', value: result.totalViolations, color: result.totalViolations > 0 ? '#dc2626' : 'var(--text-muted)' },
          { label: 'Status', value: result.submissionType === 'auto-timeout' ? 'Timed out' : result.submissionType === 'auto-violation' ? 'Violation' : 'Manual', color: 'var(--text)' },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '14px 10px', background: (stat as any).bg || 'var(--surface-hover)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Score Progress Bar */}
      <div className="lms-section" style={{ marginBottom: '20px' }}>
        <div className="lms-section-title">Score Breakdown</div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span>Score: <strong>{result.marksObtained ?? 0}</strong> / {result.totalMarks}</span>
            <span><strong>{Math.round(result.percentage ?? 0)}%</strong></span>
          </div>
          <div style={{ background: 'var(--surface-hover)', borderRadius: '10px', height: '20px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${Math.max(0, Math.min(result.percentage ?? 0, 100))}%`,
              height: '100%',
              background: passed
                ? 'linear-gradient(90deg, #22c55e, #34d399)'
                : 'linear-gradient(90deg, #ef4444, #f87171)',
              borderRadius: '10px',
              transition: 'width 1s ease-out',
            }} />
            {/* Passing mark indicator */}
            {result.exam?.passingMarks > 0 && result.totalMarks > 0 && (
              <div style={{
                position: 'absolute',
                left: `${(result.exam.passingMarks / result.totalMarks) * 100}%`,
                top: 0, bottom: 0, width: '2px',
                background: 'var(--text-muted)',
                opacity: 0.6,
              }} title={`Passing: ${result.exam.passingMarks}`} />
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            <span>0</span>
            {result.exam?.passingMarks > 0 && (
              <span>Pass: {result.exam.passingMarks}</span>
            )}
            <span>{result.totalMarks}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        <button className={`lms-btn ${activeTab === 'overview' ? 'lms-btn-primary' : ''}`} onClick={() => setActiveTab('overview')}>
          Question Navigator
        </button>
        {answers.length > 0 && (
          <button className={`lms-btn ${activeTab === 'questions' ? 'lms-btn-primary' : ''}`} onClick={() => setActiveTab('questions')}>
            Detailed Review ({totalQ})
          </button>
        )}
      </div>

      {/* Question Navigator Tab */}
      {activeTab === 'overview' && answers.length > 0 && (
        <div className="lms-section">
          <div className="lms-section-title">Question Map</div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {answers.map((a, idx) => {
                const isAtt = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
                const isNeg = a.marksObtained < 0;
                let bg = 'rgba(249,115,22,0.15)'; let color = '#f97316'; let border = 'rgba(249,115,22,0.3)';
                if (a.isCorrect === true) { bg = 'rgba(34,197,94,0.15)'; color = '#16a34a'; border = 'rgba(34,197,94,0.3)'; }
                else if (isAtt && isNeg) { bg = 'rgba(239,68,68,0.2)'; color = '#dc2626'; border = 'rgba(239,68,68,0.4)'; }
                else if (isAtt) { bg = 'rgba(239,68,68,0.15)'; color = '#dc2626'; border = 'rgba(239,68,68,0.3)'; }
                return (
                  <button key={idx} onClick={() => { setActiveTab('questions'); setQuestionFilter('all'); }}
                    style={{ width: '42px', height: '42px', borderRadius: '8px', background: bg, color, border: `1.5px solid ${border}`, fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px' }}
                    title={`Q${idx + 1}: ${a.isCorrect === true ? 'Correct' : isAtt ? `Wrong (${a.marksObtained})` : 'Not Attempted'} — ${a.question?.questionType || ''}`}>
                    <span>{idx + 1}</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>{a.marksObtained !== 0 ? (a.marksObtained > 0 ? `+${a.marksObtained}` : a.marksObtained) : '—'}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(34,197,94,0.4)', marginRight: '4px', verticalAlign: 'middle' }} />Correct</span>
              <span><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(239,68,68,0.4)', marginRight: '4px', verticalAlign: 'middle' }} />Wrong</span>
              <span><span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(249,115,22,0.4)', marginRight: '4px', verticalAlign: 'middle' }} />Not Attempted</span>
            </div>
          </div>
        </div>
      )}

      {/* Question Review Tab */}
      {activeTab === 'questions' && answers.length > 0 && (
        <div className="lms-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '8px' }}>
            <div className="lms-section-title" style={{ marginBottom: 0 }}>Question-by-Question Review</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { key: 'all' as const, label: `All (${totalQ})` },
                { key: 'correct' as const, label: `✓ ${correct}` },
                { key: 'wrong' as const, label: `✗ ${wrong}` },
                { key: 'skipped' as const, label: `— ${skipped}` },
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
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No questions match this filter.</div>
            ) : filteredAnswers.map((answer, idx) => {
              const q = answer.question;
              if (!q) return null;
              const isAttempted = (answer.selectedOptions && answer.selectedOptions.length > 0) || !!answer.textAnswer;
              const studentAnswerIds = answer.selectedOptions || [];
              const isNeg = answer.marksObtained < 0;

              let statusColor = '#f97316'; let statusBg = 'rgba(249,115,22,0.08)'; let statusBorder = 'rgba(249,115,22,0.2)'; let statusLabel = 'Not Attempted';
              if (answer.isCorrect === true) { statusColor = '#16a34a'; statusBg = 'rgba(34,197,94,0.08)'; statusBorder = 'rgba(34,197,94,0.25)'; statusLabel = 'Correct'; }
              else if (isAttempted) { statusColor = '#dc2626'; statusBg = 'rgba(239,68,68,0.08)'; statusBorder = 'rgba(239,68,68,0.25)'; statusLabel = 'Wrong'; }

              return (
                <div key={q._id || idx} style={{
                  marginBottom: '16px',
                  border: `1.5px solid ${statusBorder}`,
                  borderRadius: '10px', overflow: 'hidden',
                }}>
                  {/* Question Header */}
                  <div style={{
                    padding: '12px 16px',
                    background: statusBg,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: statusColor }}>Q{answers.indexOf(answer) + 1}</span>
                      <span style={{
                        padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                        background: statusColor === '#16a34a' ? 'rgba(34,197,94,0.15)' : statusColor === '#dc2626' ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)',
                        color: statusColor,
                      }}>
                        {statusLabel}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: '4px' }}>
                        {TYPE_LABELS[q.questionType] || q.questionType}
                      </span>
                      {answer.timeTaken ? <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⏱ {formatTime(answer.timeTaken)}</span> : null}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '14px', fontWeight: 700, fontFamily: 'monospace',
                        color: answer.marksObtained > 0 ? '#16a34a' : answer.marksObtained < 0 ? '#dc2626' : 'var(--text-muted)',
                      }}>
                        {answer.marksObtained > 0 ? '+' : ''}{answer.marksObtained}
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> / {q.marks}</span>
                      </span>
                      {isNeg && q.negativeMarks ? (
                        <span style={{ fontSize: '10px', color: '#dc2626', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                          -{q.negativeMarks} penalty
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Question Body */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '14px', fontSize: '14px', lineHeight: '1.7' }}>{q.questionText}</div>

                    {/* MCQ Options */}
                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {q.options.map((opt, oi) => {
                          const isSelected = studentAnswerIds.includes(opt._id);
                          const isCorrectOpt = opt.isCorrect;
                          let bg = 'transparent'; let borderColor = 'var(--border)'; let icon = '';
                          if (isSelected && isCorrectOpt) { bg = 'rgba(34,197,94,0.1)'; borderColor = 'rgba(34,197,94,0.4)'; icon = '✓'; }
                          else if (isSelected && !isCorrectOpt) { bg = 'rgba(239,68,68,0.1)'; borderColor = 'rgba(239,68,68,0.4)'; icon = '✗'; }
                          else if (isCorrectOpt) { bg = 'rgba(34,197,94,0.05)'; borderColor = 'rgba(34,197,94,0.25)'; icon = '✓'; }
                          return (
                            <div key={opt._id || oi} style={{ padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${borderColor}`, background: bg, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 'bold', minWidth: '22px', color: 'var(--text-muted)', fontSize: '12px' }}>{String.fromCharCode(65 + oi)}.</span>
                              <span style={{ flex: 1 }}>{opt.text}</span>
                              {icon && <span style={{ fontWeight: 700, fontSize: '14px', color: icon === '✓' ? '#16a34a' : '#dc2626' }}>{icon}</span>}
                              {isSelected && <span style={{ fontSize: '10px', fontWeight: 600, color: isCorrectOpt ? '#16a34a' : '#dc2626', background: isCorrectOpt ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: '4px' }}>Your answer</span>}
                              {isCorrectOpt && !isSelected && <span style={{ fontSize: '10px', fontWeight: 600, color: '#16a34a', background: 'rgba(34,197,94,0.1)', padding: '1px 6px', borderRadius: '4px' }}>Correct</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Text Answer Display */}
                    {answer.textAnswer && (
                      <div style={{ marginTop: '10px', padding: '12px 14px', background: isAttempted && answer.isCorrect === false ? 'rgba(239,68,68,0.05)' : 'var(--surface-hover)', border: `1px solid ${isAttempted && answer.isCorrect === false ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`, borderRadius: '8px', fontSize: '13px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Student&apos;s Answer</div>
                        <div style={{ whiteSpace: 'pre-wrap', fontFamily: q.questionType === 'numerical' ? 'monospace' : 'inherit' }}>{answer.textAnswer}</div>
                      </div>
                    )}

                    {/* Correct Answer for text-based types */}
                    {q.correctAnswer !== undefined && q.correctAnswer !== null && (
                      <div style={{ marginTop: '8px', padding: '12px 14px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '13px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginBottom: '4px', textTransform: 'uppercase' }}>Correct Answer</div>
                        <div style={{ fontWeight: 600 }}>{Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}</div>
                      </div>
                    )}

                    {/* Match Pairs display */}
                    {q.matchPairs && q.matchPairs.length > 0 && (
                      <div style={{ marginTop: '8px', padding: '12px 14px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '13px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginBottom: '6px', textTransform: 'uppercase' }}>Correct Matches</div>
                        {q.matchPairs.map((pair, pi) => (
                          <div key={pi} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '2px 0' }}>
                            <span style={{ fontWeight: 600 }}>{pair.left}</span>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                            <span>{pair.right}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Correct Order display */}
                    {q.correctOrder && q.correctOrder.length > 0 && (
                      <div style={{ marginTop: '8px', padding: '12px 14px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '13px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginBottom: '6px', textTransform: 'uppercase' }}>Correct Order</div>
                        {q.correctOrder.map((item, oi) => (
                          <div key={oi} style={{ padding: '2px 0' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginRight: '8px' }}>{oi + 1}.</span>
                            {item}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Not attempted */}
                    {!isAttempted && (
                      <div style={{ marginTop: '10px', padding: '12px 16px', background: 'rgba(249,115,22,0.06)', border: '1px dashed rgba(249,115,22,0.3)', borderRadius: '8px', fontSize: '13px', color: '#f97316', fontStyle: 'italic' }}>
                        Student did not attempt this question
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', fontSize: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#3b82f6', marginBottom: '4px', textTransform: 'uppercase' }}>Explanation</div>
                        <div style={{ lineHeight: '1.7' }}>{q.explanation}</div>
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
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '24px 0', flexWrap: 'wrap' }}>
        <Link href="/admin/results" className="lms-btn" style={{ textDecoration: 'none' }}>← Back to Results</Link>
        <Link href="/admin" className="lms-btn" style={{ textDecoration: 'none' }}>Dashboard</Link>
      </div>
    </LMSLayout>
  );
}
