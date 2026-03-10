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
      options?: { text: string; isCorrect: boolean }[];
      correctAnswer?: string | number;
      explanation?: string;
    };
    selectedOptions?: number[];
    textAnswer?: string;
    isCorrect?: boolean;
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
            return (
              <div
                key={answer.questionId || idx}
                style={{
                  marginBottom: '16px',
                  border: `1px solid ${answer.isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  background: answer.isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>Q{idx + 1}</span>
                    <span className={`lms-badge ${answer.isCorrect ? 'lms-badge-success' : 'lms-badge-danger'}`}>
                      {answer.isCorrect ? 'Correct' : 'Wrong'}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    {answer.marksObtained}/{q?.marks || 0}
                  </span>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '12px', fontSize: '14px', lineHeight: '1.6' }}>
                    {q?.questionText || 'Question text unavailable'}
                  </div>

                  {answer.selectedOptions && q?.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {q.options.map((opt, oi) => {
                        const isSelected = answer.selectedOptions?.includes(oi);
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
                            {isSelected && <span style={{ fontSize: '11px' }}>(selected)</span>}
                            {isCorrectOpt && <span style={{ color: 'var(--success)', fontSize: '11px' }}>correct</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {answer.textAnswer && (
                    <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', fontSize: '13px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Answer: </span>{answer.textAnswer}
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
