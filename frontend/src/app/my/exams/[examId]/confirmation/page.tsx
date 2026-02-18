'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

interface ConfirmationData {
  submissionId: string;
  examId: string;
  examTitle: string;
  subject: string;
  studentName: string;
  studentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string;
  timeTaken: number;
  questionsAttempted: number;
  totalQuestions: number;
  status: string;
  submissionType: string;
  resultsAvailable: boolean;
  resultsAvailableAt?: string;
}

export default function ExamConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const examId = params.examId as string;
  const submissionId = searchParams.get('submissionId');
  const { user, isAuthenticated } = useAuthStore();

  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const fetchConfirmation = async () => {
      if (!submissionId) {
        // Try to get latest submission for this exam
        try {
          const response = await api.get(`/student/exams/${examId}`);
          const activeSubmissionId = response.data.data.activeSubmissionId;
          if (!activeSubmissionId) {
            // Check results
            const resultsRes = await api.get('/student/results');
            const examResult = resultsRes.data.data.results.find(
              (r: any) => r.examId === examId
            );
            if (examResult) {
              setConfirmation({
                submissionId: examResult.id,
                examId: examResult.examId,
                examTitle: examResult.examTitle,
                subject: examResult.subject,
                studentName: `${user?.firstName || ''} ${user?.lastName || ''}`,
                studentId: user?.studentId || user?.email || '',
                attemptNumber: examResult.attemptNumber,
                startedAt: '',
                submittedAt: examResult.submittedAt,
                timeTaken: 0,
                questionsAttempted: 0,
                totalQuestions: 0,
                status: 'submitted',
                submissionType: 'submitted',
                resultsAvailable: examResult.reviewAvailable,
              });
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          // Continue to show generic confirmation
        }
        
        setConfirmation({
          submissionId: 'N/A',
          examId: examId,
          examTitle: 'Examination',
          subject: '',
          studentName: `${user?.firstName || ''} ${user?.lastName || ''}`,
          studentId: user?.studentId || user?.email || '',
          attemptNumber: 1,
          startedAt: '',
          submittedAt: new Date().toISOString(),
          timeTaken: 0,
          questionsAttempted: 0,
          totalQuestions: 0,
          status: 'submitted',
          submissionType: 'submitted',
          resultsAvailable: false,
        });
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get(`/student/submissions/${submissionId}`);
        const data = response.data.data;
        
        setConfirmation({
          submissionId: data.submission?.id || submissionId,
          examId: data.exam?._id || examId,
          examTitle: data.exam?.title || 'Examination',
          subject: data.exam?.subject || '',
          studentName: `${user?.firstName || ''} ${user?.lastName || ''}`,
          studentId: user?.studentId || user?.email || '',
          attemptNumber: data.submission?.attemptNumber || 1,
          startedAt: data.submission?.startedAt || '',
          submittedAt: data.submission?.submittedAt || new Date().toISOString(),
          timeTaken: data.submission?.timeTaken || 0,
          questionsAttempted: data.submission?.questionsAttempted || 0,
          totalQuestions: data.exam?.questionCount || data.submission?.paletteState?.length || 0,
          status: data.submission?.status || 'submitted',
          submissionType: data.submission?.submissionType || 'submitted',
          resultsAvailable: data.exam?.allowReview || false,
          resultsAvailableAt: data.exam?.reviewAvailableFrom,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load confirmation');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfirmation();
  }, [examId, submissionId, user]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const getStatusLabel = (status: string, type: string) => {
    if (type === 'auto-timeout' || status === 'auto-submitted') {
      return 'Auto-Submitted (Time Expired)';
    }
    if (type === 'violation' || status === 'violation-submitted') {
      return 'Submitted (Violation Limit)';
    }
    if (status === 'force-submitted') {
      return 'Force Submitted (Admin)';
    }
    return 'Submitted Successfully';
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Submission Confirmation" breadcrumbs={[{ label: 'Loading...' }]}>
        <div className="lms-loading">Loading confirmation...</div>
      </LMSLayout>
    );
  }

  if (error) {
    return (
      <LMSLayout pageTitle="Submission Confirmation" breadcrumbs={[{ label: 'Error' }]}>
        <div className="lms-alert lms-alert-error">{error}</div>
        <div style={{ marginTop: '16px' }}>
          <Link href="/my/exams" className="lms-btn">
            Back to Exams
          </Link>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Submission Confirmation"
      breadcrumbs={[
        { label: 'My Dashboard', href: '/my' },
        { label: 'Examinations', href: '/my/exams' },
        { label: 'Confirmation' },
      ]}
    >
      {/* Success Message */}
      <div className="lms-alert lms-alert-success" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          ✓ Examination Submitted Successfully
        </div>
        <div>
          Your answers have been recorded. Please save this confirmation for your records.
        </div>
      </div>

      {/* Confirmation Receipt */}
      <div className="lms-section" id="confirmation-receipt">
        <div className="lms-section-title">Submission Receipt</div>
        
        <div style={{ border: '2px solid var(--border)', padding: '24px', backgroundColor: 'var(--bg-surface)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>PROCTORED EXAM PORTAL</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>Official Submission Confirmation</p>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Exam Details */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Examination Details
              </h4>
              <table style={{ fontSize: '13px', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Examination:</td>
                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{confirmation?.examTitle}</td>
                  </tr>
                  {confirmation?.subject && (
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Subject:</td>
                      <td style={{ padding: '4px 0' }}>{confirmation.subject}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Attempt:</td>
                    <td style={{ padding: '4px 0' }}>{confirmation?.attemptNumber}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Student Details */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Student Details
              </h4>
              <table style={{ fontSize: '13px', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Name:</td>
                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{confirmation?.studentName}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Student ID:</td>
                    <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>{confirmation?.studentId}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Submission Details */}
            <div>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Submission Details
              </h4>
              <table style={{ fontSize: '13px', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Submission ID:</td>
                    <td style={{ padding: '4px 0', fontFamily: 'monospace', fontSize: '11px' }}>
                      {confirmation?.submissionId}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Submitted At:</td>
                    <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>
                      {confirmation?.submittedAt 
                        ? format(new Date(confirmation.submittedAt), 'dd/MM/yyyy HH:mm:ss')
                        : 'N/A'}
                    </td>
                  </tr>
                  {confirmation?.timeTaken !== undefined && confirmation.timeTaken > 0 && (
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Time Taken:</td>
                      <td style={{ padding: '4px 0' }}>{formatTime(confirmation.timeTaken)}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Status:</td>
                    <td style={{ padding: '4px 0' }}>
                      <span className="lms-status lms-status-success">
                        {getStatusLabel(confirmation?.status || '', confirmation?.submissionType || '')}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Attempt Summary */}
            {(confirmation?.questionsAttempted || 0) > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Attempt Summary
                </h4>
                <table style={{ fontSize: '13px', width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Questions Attempted:</td>
                      <td style={{ padding: '4px 0' }}>
                        {confirmation?.questionsAttempted} / {confirmation?.totalQuestions}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Results Info */}
          <div style={{ marginTop: '24px', padding: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <strong>Results:</strong>{' '}
            {confirmation?.resultsAvailable ? (
              <span>
                Results will be available after evaluation.{' '}
                <Link href="/my/results" style={{ color: 'var(--primary)' }}>
                  View Results
                </Link>
              </span>
            ) : confirmation?.resultsAvailableAt ? (
              <span>
                Results will be available after{' '}
                {format(new Date(confirmation.resultsAvailableAt), 'dd/MM/yyyy HH:mm')}
              </span>
            ) : (
              <span>Results will be published by the examination controller.</span>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0 }}>
              This is a computer-generated confirmation. No signature is required.
            </p>
            <p style={{ margin: '4px 0 0' }}>
              Generated at: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={handlePrint} className="lms-btn lms-btn-primary">
          Print Confirmation
        </button>
        <Link href="/my/exams" className="lms-btn">
          Back to Examinations
        </Link>
        <Link href="/my/results" className="lms-btn">
          View All Results
        </Link>
        <Link href="/my" className="lms-btn">
          Go to Dashboard
        </Link>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #confirmation-receipt, #confirmation-receipt * {
            visibility: visible;
          }
          #confirmation-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </LMSLayout>
  );
}
