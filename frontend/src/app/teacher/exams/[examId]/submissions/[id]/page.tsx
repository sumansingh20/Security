'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { safeToLocaleString } from '@/lib/dateUtils';

interface SubmissionDetail {
  _id: string;
  exam: { _id: string; title: string; subject?: string; totalMarks: number; passingMarks: number };
  student: { _id: string; name?: string; firstName?: string; lastName?: string; email: string; rollNumber?: string };
  answers: {
    questionId: string;
    question: {
      _id: string;
      questionText: string;
      questionType: string;
      marks: number;
      negativeMarks?: number;
      options?: { _id: string; text: string; isCorrect: boolean }[];
      correctAnswer?: string | number;
      explanation?: string;
      matchPairs?: { left: string; right: string }[];
      correctOrder?: string[];
    };
    selectedOptions?: string[];
    textAnswer?: string;
    isCorrect?: boolean | null;
    marksObtained: number;
  }[];
  score: number;
  percentage: number;
  status: string;
  startTime: string;
  submitTime?: string;
  timeSpent: number;
  violations: { type: string; timestamp: string; details?: string }[];
  isPassed?: boolean;
  submissionType?: string;
}

export default function TeacherSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const submissionId = params.id as string;
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/teacher/submissions/${submissionId}`);
        setSubmission(res.data.data?.submission || res.data.submission || res.data.data);
      } catch (err: any) {
        // Fallback: try admin endpoint
        try {
          const res2 = await api.get(`/admin/submissions/${submissionId}`);
          setSubmission(res2.data.data?.submission || res2.data.submission || res2.data.data);
        } catch {
          setError(err.response?.data?.message || 'Failed to load submission');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [examId, submissionId]);

  if (loading) {
    return (
      <LMSLayout pageTitle="Submission Detail" breadcrumbs={[{ label: 'Teacher' }, { label: 'Examinations', href: '/teacher/exams' }, { label: 'Submission' }]}>
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading submission...</span>
        </div>
      </LMSLayout>
    );
  }

  if (error || !submission) {
    return (
      <LMSLayout pageTitle="Submission Detail" breadcrumbs={[{ label: 'Teacher' }, { label: 'Examinations', href: '/teacher/exams' }, { label: 'Error' }]}>
        <div className="lms-alert lms-alert-error">{error || 'Submission not found'}</div>
        <button onClick={() => router.back()} className="lms-btn" style={{ marginTop: '12px' }}>Go Back</button>
      </LMSLayout>
    );
  }

  const studentName = submission.student?.name || `${submission.student?.firstName || ''} ${submission.student?.lastName || ''}`.trim() || submission.student?.email;
  // Use percentage-based pass check: if passingMarks configured, convert to percentage of totalMarks
  const passingPercentage = (submission.exam?.totalMarks && submission.exam?.passingMarks)
    ? (submission.exam.passingMarks / submission.exam.totalMarks) * 100
    : 40;
  const isPassed = submission.isPassed ?? ((submission.percentage ?? 0) >= passingPercentage);

  return (
    <LMSLayout
      pageTitle="Submission Detail"
      breadcrumbs={[
        { label: 'Teacher' },
        { label: 'Examinations', href: '/teacher/exams' },
        { label: submission.exam?.title || 'Exam', href: `/teacher/exams/${examId}/results` },
        { label: studentName || 'Submission' },
      ]}
    >
      {/* Score Banner */}
      <div
        className={`lms-alert ${isPassed ? 'lms-alert-success' : 'lms-alert-error'} animate-fadeIn`}
        style={{ textAlign: 'center' }}
      >
        <div className="lms-alert-title" style={{ fontSize: '20px' }}>
          {isPassed ? 'PASSED' : 'FAILED'}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0' }}>
          {submission.score ?? 0} / {submission.exam?.totalMarks ?? 0}
        </div>
        <div style={{ fontSize: '14px' }}>
          {Math.round(submission.percentage ?? 0)}% - Passing: {submission.exam?.passingMarks ?? 0} marks
        </div>
      </div>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.05s' }}>
          <div className="lms-section-title">Student Information</div>
          <div className="lms-table-container">
            <table className="lms-table">
              <tbody>
                <tr><td style={{ fontWeight: 'bold', width: '120px' }}>Name</td><td>{studentName}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Email</td><td>{submission.student?.email}</td></tr>
                {submission.student?.rollNumber && <tr><td style={{ fontWeight: 'bold' }}>Roll No</td><td>{submission.student.rollNumber}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="lms-section-title">Submission Info</div>
          <div className="lms-table-container">
            <table className="lms-table">
              <tbody>
                <tr><td style={{ fontWeight: 'bold', width: '120px' }}>Status</td><td><span className="lms-badge" style={{ textTransform: 'capitalize' }}>{submission.status}</span></td></tr>
                {submission.submissionType && <tr><td style={{ fontWeight: 'bold' }}>Type</td><td>{submission.submissionType}</td></tr>}
                <tr><td style={{ fontWeight: 'bold' }}>Time Spent</td><td>{Math.round((submission.timeSpent || 0) / 60)} min</td></tr>
                {submission.submitTime && <tr><td style={{ fontWeight: 'bold' }}>Submitted</td><td className="font-mono">{safeToLocaleString(submission.submitTime)}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Violations */}
      {submission.violations && submission.violations.length > 0 && (
        <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.15s' }}>
          <div className="lms-section-title" style={{ color: 'var(--danger)' }}>Violations ({submission.violations.length})</div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {submission.violations.map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', padding: '8px 12px', background: 'rgba(239,68,68,0.05)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span className="lms-badge lms-badge-danger">{v.type}</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{safeToLocaleString(v.timestamp)}</span>
                {v.details && <span>{v.details}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answers */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="lms-section-title">Answers ({submission.answers?.length || 0})</div>
        <div style={{ padding: '16px' }}>
          {submission.answers?.map((answer, idx) => {
            const q = answer.question;
            const selectedIds = (answer.selectedOptions || []).map(String);
            const hasTextAnswer = !!answer.textAnswer;
            const isAttempted = selectedIds.length > 0 || hasTextAnswer;
            const isCorrect = answer.isCorrect === true;
            const isWrong = isAttempted && !isCorrect;
            const isSkipped = !isAttempted;
            return (
              <div
                key={answer.questionId || idx}
                style={{
                  marginBottom: '16px',
                  border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : isWrong ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  background: isCorrect ? 'rgba(34,197,94,0.08)' : isWrong ? 'rgba(239,68,68,0.08)' : 'rgba(249,115,22,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Q{idx + 1}</span>
                    <span className={`lms-badge ${isCorrect ? 'lms-badge-success' : isWrong ? 'lms-badge-danger' : 'lms-badge-warning'}`}>
                      {isCorrect ? 'Correct' : isWrong ? 'Wrong' : 'Not Attempted'}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: '13px', fontWeight: 'bold', color: answer.marksObtained > 0 ? '#16a34a' : answer.marksObtained < 0 ? '#dc2626' : undefined }}>
                    {answer.marksObtained > 0 ? '+' : ''}{answer.marksObtained}/{q?.marks || 0}
                  </span>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.6' }}>
                    {q?.questionText || 'Question text unavailable'}
                  </div>

                  {answer.selectedOptions && q?.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {q.options.map((opt, oi) => {
                        const isSelected = selectedIds.includes(opt._id?.toString?.() || String(oi));
                        const isCorrectOpt = opt.isCorrect;

                        let bg = 'transparent';
                        let borderColor = 'var(--border)';
                        if (isSelected && isCorrectOpt) { bg = 'rgba(34,197,94,0.1)'; borderColor = 'rgba(34,197,94,0.4)'; }
                        else if (isSelected && !isCorrectOpt) { bg = 'rgba(239,68,68,0.1)'; borderColor = 'rgba(239,68,68,0.4)'; }
                        else if (isCorrectOpt) { bg = 'rgba(34,197,94,0.05)'; borderColor = 'rgba(34,197,94,0.3)'; }

                        return (
                          <div key={oi} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${borderColor}`, background: bg, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{String.fromCharCode(65 + oi)}.</span>
                            <span style={{ flex: 1 }}>{opt.text}</span>
                            {isSelected && <span style={{ fontSize: '11px', fontWeight: 600, color: isCorrectOpt ? '#16a34a' : '#dc2626' }}>(selected{isCorrectOpt ? ' - correct' : ''})</span>}
                            {!isSelected && isCorrectOpt && <span style={{ color: 'var(--success)', fontSize: '11px', fontWeight: 600 }}>(correct answer)</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {answer.textAnswer && (
                    <div style={{
                      background: isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      borderRadius: '6px', padding: '10px', fontSize: '13px', marginTop: '8px',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Student&apos;s Answer</span>
                      <div style={{ marginTop: '4px', fontWeight: 500 }}>{answer.textAnswer}</div>
                    </div>
                  )}

                  {q?.correctAnswer !== undefined && q?.correctAnswer !== null && (
                    <div style={{
                      marginTop: '8px', padding: '10px 14px',
                      background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: '6px', fontSize: '13px',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px' }}>Correct Answer</span>
                      <div style={{ marginTop: '4px', fontWeight: 600, color: '#16a34a' }}>
                        {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                      </div>
                    </div>
                  )}

                  {q?.matchPairs && q.matchPairs.length > 0 && (
                    <div style={{
                      marginTop: '8px', padding: '10px 14px',
                      background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: '6px', fontSize: '13px',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px' }}>Correct Matches</span>
                      {q.matchPairs.map((pair, pi) => (
                        <div key={pi} style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{pair.left}</span>
                          <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>{pair.right}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q?.correctOrder && q.correctOrder.length > 0 && (
                    <div style={{
                      marginTop: '8px', padding: '10px 14px',
                      background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: '6px', fontSize: '13px',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px' }}>Correct Order</span>
                      <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                        {q.correctOrder.map((item, oi) => <li key={oi} style={{ marginTop: '2px' }}>{item}</li>)}
                      </ol>
                    </div>
                  )}

                  {answer.marksObtained < 0 && (q?.negativeMarks ?? 0) > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⚠ Negative marking: -{q.negativeMarks} for wrong answer
                    </div>
                  )}

                  {isSkipped && (
                    <div style={{
                      marginTop: '8px', padding: '10px 14px',
                      background: 'rgba(249,115,22,0.06)', border: '1px dashed rgba(249,115,22,0.3)',
                      borderRadius: '6px', fontSize: '13px', color: '#f97316', fontStyle: 'italic',
                    }}>
                      Student did not attempt this question
                    </div>
                  )}

                  {q?.explanation && (
                    <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', fontSize: '12px' }}>
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button onClick={() => router.back()} className="lms-btn">Back to Results</button>
        <Link href={`/teacher/exams/${examId}`} className="lms-btn">Exam Details</Link>
      </div>
    </LMSLayout>
  );
}
