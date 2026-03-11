'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import PageWrapper from '@/components/layouts/PageWrapper';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag,
  User,
  Mail,
  Hash,
  Award,
  BarChart3,
  Timer,
  ShieldAlert,
  FileText,
  ChevronDown,
  ChevronUp,
  Minus,
} from 'lucide-react';
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

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'mcq-single': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  'mcq-multiple': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  'true-false': { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  'fill-blank': { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
  'numerical': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  'short-answer': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  'long-answer': { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  'matching': { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
  'ordering': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  'image-based': { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  'code': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const examId = params.examId as string;
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped'>('all');
  const [expandedViolations, setExpandedViolations] = useState(false);

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

  const formatTime = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={[{ name: 'Loading...' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!submission) {
    return (
      <PageWrapper breadcrumbs={[{ name: 'Submission not found' }]}>
        <div className="text-center py-16">
          <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">Submission not found</p>
          <Link href={`/admin/exams/${examId}/results`} className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
            Back to Results
          </Link>
        </div>
      </PageWrapper>
    );
  }

  // Normalize field names (handle both old and new API response)
  const studentName = submission.student.firstName
    ? `${submission.student.firstName} ${submission.student.lastName || ''}`.trim()
    : submission.student.name || 'Unknown Student';
  const score = submission.marksObtained ?? submission.score ?? 0;
  const totalMarks = submission.totalMarks || submission.exam.totalMarks || 0;
  const percentage = submission.percentage ?? (totalMarks > 0 ? (score / totalMarks) * 100 : 0);
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

  const filteredAnswers = answers.filter(a => {
    const isAtt = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
    if (filter === 'correct') return a.isCorrect === true;
    if (filter === 'wrong') return isAtt && a.isCorrect === false;
    if (filter === 'skipped') return !isAtt;
    return true;
  });

  return (
    <PageWrapper
      breadcrumbs={[
        { name: 'Site Administration' },
        { name: 'Quiz Administration', href: '/admin/exams' },
        { name: submission.exam.title || 'Exam', href: `/admin/exams/${examId}` },
        { name: 'Results', href: `/admin/exams/${examId}/results` },
        { name: studentName },
      ]}
    >
      {/* Back Link */}
      <Link
        href={`/admin/exams/${examId}/results`}
        className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline text-sm mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Results
      </Link>

      {/* Hero Banner */}
      <div className={`relative overflow-hidden rounded-2xl mb-6 ${
        passed
          ? 'bg-gradient-to-br from-emerald-500 to-green-600'
          : 'bg-gradient-to-br from-red-500 to-rose-600'
      }`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white" />
          <div className="absolute -left-4 -bottom-4 w-32 h-32 rounded-full bg-white" />
        </div>
        <div className="relative px-8 py-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{submission.exam.title}</h1>
              {submission.exam.subject && (
                <p className="text-white/80 text-sm">{submission.exam.subject}</p>
              )}
              <p className="text-white/70 text-sm mt-1">Attempt #{submission.attemptNumber}</p>
            </div>
            <div className="text-center md:text-right">
              <div className="flex items-center gap-3 justify-center md:justify-end">
                {passed ? (
                  <CheckCircle className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
                <span className="text-3xl md:text-4xl font-black tracking-tight">
                  {passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-4xl md:text-5xl font-black">{score}</span>
                <span className="text-2xl font-light opacity-70"> / {totalMarks}</span>
              </div>
              <div className="text-lg font-semibold mt-1 text-white/90">
                {Math.round(percentage * 10) / 10}%
              </div>
              {negativeTotal < 0 && (
                <div className="text-xs mt-1 bg-white/20 rounded-full px-3 py-0.5 inline-block">
                  {negativeTotal.toFixed(1)} negative marks
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { icon: <FileText className="w-4 h-4" />, value: totalQ, label: 'Questions', color: 'text-gray-700 dark:text-gray-200' },
          { icon: <CheckCircle className="w-4 h-4" />, value: attempted, label: 'Attempted', color: 'text-blue-600 dark:text-blue-400' },
          { icon: <CheckCircle className="w-4 h-4" />, value: correct, label: 'Correct', color: 'text-green-600 dark:text-green-400' },
          { icon: <XCircle className="w-4 h-4" />, value: wrong, label: 'Wrong', color: 'text-red-600 dark:text-red-400' },
          { icon: <Minus className="w-4 h-4" />, value: skipped, label: 'Skipped', color: 'text-orange-500' },
          { icon: <Award className="w-4 h-4" />, value: `${Math.round(percentage)}%`, label: 'Score', color: passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
          { icon: <Timer className="w-4 h-4" />, value: formatTime(timeTaken), label: 'Time', color: 'text-gray-700 dark:text-gray-200' },
          { icon: <ShieldAlert className="w-4 h-4" />, value: totalViolations, label: 'Violations', color: totalViolations > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center shadow-sm">
            <div className={`flex items-center justify-center gap-1 mb-1 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Questions */}
        <div className="lg:col-span-2">
          {/* Question Map */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 mb-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm uppercase tracking-wide">Question Map</h3>
            <div className="flex flex-wrap gap-2">
              {answers.map((a, idx) => {
                const isAtt = (a.selectedOptions && a.selectedOptions.length > 0) || !!a.textAnswer;
                let bgClass = 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
                if (a.isCorrect === true) bgClass = 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
                else if (isAtt) bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
                return (
                  <div key={idx} className={`w-10 h-10 rounded-lg border flex flex-col items-center justify-center text-xs font-bold ${bgClass}`}
                    title={`Q${idx + 1}: ${a.isCorrect === true ? 'Correct' : isAtt ? 'Wrong' : 'Skipped'} (${a.marksObtained}/${a.question?.marks || 0})`}>
                    <span>{idx + 1}</span>
                    {a.marksObtained !== 0 && (
                      <span className="text-[9px] opacity-75">{a.marksObtained > 0 ? `+${a.marksObtained}` : a.marksObtained}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 dark:bg-green-800 inline-block" /> Correct</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-800 inline-block" /> Wrong</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-800 inline-block" /> Skipped</span>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: 'all' as const, label: `All (${totalQ})`, icon: <FileText className="w-3.5 h-3.5" /> },
              { key: 'correct' as const, label: `Correct (${correct})`, icon: <CheckCircle className="w-3.5 h-3.5" /> },
              { key: 'wrong' as const, label: `Wrong (${wrong})`, icon: <XCircle className="w-3.5 h-3.5" /> },
              { key: 'skipped' as const, label: `Skipped (${skipped})`, icon: <Minus className="w-3.5 h-3.5" /> },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredAnswers.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-400">
                No questions match this filter
              </div>
            ) : filteredAnswers.map((answer, idx) => {
              const q = answer.question;
              if (!q) return null;
              const isAttempted = (answer.selectedOptions && answer.selectedOptions.length > 0) || !!answer.textAnswer;
              const studentOptionIds = answer.selectedOptions || [];
              const qNum = answers.indexOf(answer) + 1;
              const typeColor = TYPE_COLORS[q.questionType] || TYPE_COLORS['code'];

              let borderClass = 'border-orange-200 dark:border-orange-800';
              let headerBg = 'bg-orange-50 dark:bg-orange-900/20';
              let statusIcon = <Minus className="w-5 h-5 text-orange-500" />;
              let statusLabel = 'Skipped';
              let statusColor = 'text-orange-600 dark:text-orange-400';

              if (answer.isCorrect === true) {
                borderClass = 'border-green-200 dark:border-green-800';
                headerBg = 'bg-green-50 dark:bg-green-900/20';
                statusIcon = <CheckCircle className="w-5 h-5 text-green-500" />;
                statusLabel = 'Correct';
                statusColor = 'text-green-600 dark:text-green-400';
              } else if (isAttempted) {
                borderClass = 'border-red-200 dark:border-red-800';
                headerBg = 'bg-red-50 dark:bg-red-900/20';
                statusIcon = <XCircle className="w-5 h-5 text-red-500" />;
                statusLabel = 'Wrong';
                statusColor = 'text-red-600 dark:text-red-400';
              }

              return (
                <div key={q._id || idx} className={`bg-white dark:bg-gray-800 rounded-xl border-2 ${borderClass} overflow-hidden shadow-sm`}>
                  {/* Question Header */}
                  <div className={`${headerBg} px-5 py-3 flex items-center justify-between flex-wrap gap-2`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        answer.isCorrect === true ? 'bg-green-500' : isAttempted ? 'bg-red-500' : 'bg-orange-400'
                      }`}>
                        {qNum}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${typeColor.bg} ${typeColor.text}`}>
                          {TYPE_LABELS[q.questionType] || (q.questionType || '').toUpperCase()}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${statusColor}`}>
                          {statusIcon}
                          {statusLabel}
                        </span>
                        {answer.markedForReview && (
                          <Flag className="w-4 h-4 text-purple-500 fill-purple-200" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {answer.timeTaken ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(answer.timeTaken)}
                        </span>
                      ) : null}
                      <div className={`text-lg font-bold font-mono ${
                        answer.marksObtained > 0 ? 'text-green-600 dark:text-green-400' :
                        answer.marksObtained < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-gray-400'
                      }`}>
                        {answer.marksObtained > 0 ? '+' : ''}{answer.marksObtained}
                        <span className="text-sm font-normal text-gray-400"> / {q.marks}</span>
                      </div>
                    </div>
                  </div>

                  {/* Question Body */}
                  <div className="px-5 py-4">
                    <p className="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed mb-4">{q.questionText}</p>

                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Question" className="max-w-md rounded-lg border border-gray-200 dark:border-gray-700 mb-4" />
                    )}

                    {/* MCQ Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const isSelected = studentOptionIds.includes(opt._id);
                          const isCorrectOpt = opt.isCorrect;

                          let optBorder = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
                          let icon = null;
                          if (isSelected && isCorrectOpt) {
                            optBorder = 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20';
                            icon = <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
                          } else if (isSelected && !isCorrectOpt) {
                            optBorder = 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20';
                            icon = <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
                          } else if (isCorrectOpt) {
                            optBorder = 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10 border-dashed';
                            icon = <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />;
                          }

                          return (
                            <div key={opt._id || oi} className={`flex items-center gap-3 px-4 py-3 border-2 rounded-xl transition-all ${optBorder}`}>
                              <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{opt.text}</span>
                              {icon}
                              {isSelected && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCorrectOpt ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                }`}>
                                  Your Answer
                                </span>
                              )}
                              {!isSelected && isCorrectOpt && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                  Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Text Answer */}
                    {answer.textAnswer && (
                      <div className={`mt-3 p-4 rounded-xl border ${
                        answer.isCorrect === true
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : answer.isCorrect === false
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Student&apos;s Answer</div>
                        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-medium">
                          {typeof answer.textAnswer === 'string' ? answer.textAnswer : JSON.stringify(answer.textAnswer)}
                        </div>
                      </div>
                    )}

                    {/* Correct Answer */}
                    {q.correctAnswer !== undefined && q.correctAnswer !== null && (
                      <div className="mt-3 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">Correct Answer</div>
                        <div className="text-sm font-semibold text-green-800 dark:text-green-200">
                          {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                        </div>
                      </div>
                    )}

                    {/* Match Pairs */}
                    {q.matchPairs && q.matchPairs.length > 0 && (
                      <div className="mt-3 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Correct Matches</div>
                        <div className="space-y-1.5">
                          {q.matchPairs.map((pair, pi) => (
                            <div key={pi} className="flex items-center gap-2 text-sm">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{pair.left}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-700 dark:text-green-300">{pair.right}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Correct Order */}
                    {q.correctOrder && q.correctOrder.length > 0 && (
                      <div className="mt-3 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Correct Order</div>
                        <ol className="space-y-1 text-sm list-decimal list-inside text-gray-700 dark:text-gray-300">
                          {q.correctOrder.map((item, oi) => <li key={oi}>{item}</li>)}
                        </ol>
                      </div>
                    )}

                    {/* Not Attempted */}
                    {!isAttempted && (
                      <div className="mt-3 p-4 rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 text-center">
                        <Minus className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                        <p className="text-sm text-orange-500 dark:text-orange-400 italic">Not attempted</p>
                      </div>
                    )}

                    {/* Negative marks badge */}
                    {answer.marksObtained < 0 && q.negativeMarks && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-red-500 dark:text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Negative marking: -{q.negativeMarks} for wrong answer</span>
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Explanation</div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Student Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> Student Information
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {(studentName.charAt(0) || '?').toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">{studentName}</div>
                  <div className="text-xs text-gray-400">{submission.student.email}</div>
                </div>
              </div>
              {(submission.student.rollNumber || submission.student.studentId) && (
                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="font-mono">{submission.student.rollNumber || submission.student.studentId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className={`px-5 py-3 ${passed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Award className="w-4 h-4" /> Score Summary
              </h3>
            </div>
            <div className="p-5">
              <div className="text-center mb-4">
                <div className={`text-5xl font-black ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {score}
                  <span className="text-xl font-normal text-gray-300 dark:text-gray-600">/{totalMarks}</span>
                </div>
                <div className={`text-lg font-bold mt-1 ${passed ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.round(percentage * 10) / 10}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-1">
                <div
                  className={`h-3 rounded-full transition-all duration-1000 ${
                    passed ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
                />
                {/* Passing line */}
                {submission.exam.passingMarks > 0 && totalMarks > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500"
                    style={{ left: `${(submission.exam.passingMarks / totalMarks) * 100}%` }}
                    title={`Pass: ${submission.exam.passingMarks}`}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-4">
                <span>0</span>
                <span>Pass: {submission.exam.passingMarks}</span>
                <span>{totalMarks}</span>
              </div>

              {negativeTotal < 0 && (
                <div className="text-center text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg py-2 mb-3">
                  Negative deduction: {negativeTotal.toFixed(1)}
                </div>
              )}

              {/* Mini Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg py-2">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">{correct}</div>
                  <div className="text-[10px] text-gray-400">Correct</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg py-2">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">{wrong}</div>
                  <div className="text-[10px] text-gray-400">Wrong</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg py-2">
                  <div className="text-lg font-bold text-orange-500">{skipped}</div>
                  <div className="text-[10px] text-gray-400">Skipped</div>
                </div>
              </div>
            </div>
          </div>

          {/* Attempt Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-5 py-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Attempt Details
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Started', value: startedAt ? safeFormat(startedAt, 'dd MMM yyyy, HH:mm') : '—' },
                { label: 'Submitted', value: submittedAt ? safeFormat(submittedAt, 'dd MMM yyyy, HH:mm') : '—' },
                { label: 'Duration', value: submission.exam.duration ? `${submission.exam.duration} min` : '—' },
                { label: 'Time Spent', value: formatTime(timeTaken) },
                { label: 'Submission', value: submission.submissionType === 'auto-timeout' ? 'Auto (timeout)' : submission.submissionType === 'auto-violation' ? 'Auto (violation)' : submission.submissionType === 'admin-force' ? 'Force-submitted' : 'Manual' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 dark:text-gray-500">{item.label}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 text-right">{item.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-400 dark:text-gray-500">Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  submission.status === 'evaluated' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  submission.status === 'submitted' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {(submission.status || '').replace(/-/g, ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Violations Card */}
          {totalViolations > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-red-200 dark:border-red-800 overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedViolations(!expandedViolations)}
                className="w-full bg-red-50 dark:bg-red-900/30 px-5 py-3 flex items-center justify-between"
              >
                <h3 className="text-red-700 dark:text-red-400 font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Violations ({totalViolations})
                </h3>
                {expandedViolations ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
              </button>
              {expandedViolations && violations.length > 0 && (
                <div className="p-4 max-h-56 overflow-y-auto">
                  <ul className="space-y-2">
                    {violations.map((v, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">{(v.type || '').replace(/_|-/g, ' ')}</p>
                          <p className="text-[11px] text-gray-400">{safeFormat(v.timestamp, 'HH:mm:ss')}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
