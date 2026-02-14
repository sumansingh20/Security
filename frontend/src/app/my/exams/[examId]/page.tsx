'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format, isAfter, isBefore } from 'date-fns';
import toast from 'react-hot-toast';

interface ExamData {
  _id: string;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  questionCount: number;
  startTime: string;
  endTime: string;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  calculatorEnabled: boolean;
  calculatorType: string;
  negativeMarking: boolean;
  allowReview: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  status: string;
}

export default function ExamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(0);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [backendCanStart, setBackendCanStart] = useState(false);
  const [computedStatus, setComputedStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        const response = await api.get(`/student/exams/${examId}`);
        const d = response.data.data;
        setExam(d.exam);
        setAttemptCount(d.attemptCount || 0);
        setRemainingAttempts(d.remainingAttempts ?? d.exam.maxAttempts);
        setActiveSubmissionId(d.activeSubmissionId || null);
        setBackendCanStart(d.canStart || false);
        setComputedStatus(d.exam.computedStatus || d.exam.status || '');
        if (d.serverTime) setServerTime(new Date(d.serverTime));
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load exam details');
        router.push('/my/exams');
      } finally {
        setIsLoading(false);
      }
    };
    fetchExamDetails();
  }, [examId, router]);

  const handleStartAttempt = async () => {
    setIsStarting(true);
    try {
      // Just navigate to attempt page — it will call /start internally
      router.push(`/my/exams/${examId}/attempt`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start exam');
      setIsStarting(false);
    }
  };

  if (isLoading || !exam) {
    return (
      <LMSLayout
        pageTitle="Exam Details"
        breadcrumbs={[{ label: 'Dashboard', href: '/my' }, { label: 'Examinations', href: '/my/exams' }, { label: 'Loading...' }]}
      >
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading exam details...</span>
        </div>
      </LMSLayout>
    );
  }

  const now = serverTime || new Date();
  // Use computedStatus from backend which is reliable (considers server time + attempt count)
  const isOpen = computedStatus === 'available' || computedStatus === 'in-progress' || 
    (exam.status === 'ongoing') || 
    (isAfter(now, new Date(exam.startTime)) && isBefore(now, new Date(exam.endTime)));
  const isUpcoming = computedStatus === 'upcoming' || (!isOpen && isBefore(now, new Date(exam.startTime)));
  const isEnded = computedStatus === 'ended' || computedStatus === 'completed' || (!isOpen && !isUpcoming);
  const hasAttemptsRemaining = remainingAttempts > 0;
  const canAttempt = (backendCanStart || isOpen) && hasAttemptsRemaining;
  const hasActiveAttempt = !!activeSubmissionId;

  return (
    <LMSLayout
      pageTitle={exam.title}
      breadcrumbs={[
        { label: 'Dashboard', href: '/my' },
        { label: 'Examinations', href: '/my/exams' },
        { label: exam.title },
      ]}
    >
      {/* Status Banner */}
      {isOpen && canAttempt && (
        <div className="lms-alert lms-alert-success live-exam-alert animate-pulse-border">
          <div className="live-indicator"></div>
          <div>
            <div className="lms-alert-title">🟢 EXAMINATION IS OPEN</div>
            <div>This examination is currently open. You can start your attempt now.</div>
          </div>
        </div>
      )}
      {isUpcoming && (
        <div className="lms-alert lms-alert-info">
          <div className="lms-alert-title">📅 UPCOMING EXAMINATION</div>
          <div>This examination will open on {format(new Date(exam.startTime), 'dd MMM yyyy, HH:mm')}.</div>
        </div>
      )}
      {isEnded && (
        <div className="lms-alert lms-alert-error">
          <div className="lms-alert-title">🔒 EXAMINATION CLOSED</div>
          <div>This examination window has ended.</div>
        </div>
      )}
      {isOpen && !hasAttemptsRemaining && (
        <div className="lms-alert lms-alert-warning">
          <div className="lms-alert-title">⚠️ NO ATTEMPTS REMAINING</div>
          <div>You have used all {exam.maxAttempts} allowed attempt(s) for this examination.</div>
        </div>
      )}

      {/* Exam Info Grid */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
          <div className="lms-stat-icon">⏱️</div>
          <div className="lms-stat-value">{exam.duration}</div>
          <div className="lms-stat-label">Minutes</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-icon">📝</div>
          <div className="lms-stat-value">{exam.questionCount}</div>
          <div className="lms-stat-label">Questions</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">🏆</div>
          <div className="lms-stat-value">{exam.totalMarks}</div>
          <div className="lms-stat-label">Total Marks</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon">✅</div>
          <div className="lms-stat-value">{exam.passingMarks}</div>
          <div className="lms-stat-label">Passing Marks</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">🔄</div>
          <div className="lms-stat-value">{attemptCount}/{exam.maxAttempts}</div>
          <div className="lms-stat-label">Attempts Used</div>
        </div>
      </div>

      {/* Time Window */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <div className="lms-section-title"><span className="section-icon">📅</span> Examination Window</div>
        <div className="lms-table-container">
          <table className="lms-table">
            <tbody>
              <tr>
                <td style={{ width: '160px', fontWeight: 'bold' }}>Opens</td>
                <td className="font-mono">{format(new Date(exam.startTime), 'EEEE, dd MMMM yyyy — HH:mm')}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Closes</td>
                <td className="font-mono">{format(new Date(exam.endTime), 'EEEE, dd MMMM yyyy — HH:mm')}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Duration</td>
                <td>{exam.duration} minutes from the moment you start</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Subject</td>
                <td>{exam.subject || 'General'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.15s' }}>
        <div className="lms-section-title"><span className="section-icon">📋</span> Exam Instructions</div>
        <div className="lms-info-box-body" style={{ fontSize: '13px', lineHeight: '1.8' }}>
          {exam.instructions ? (
            <div dangerouslySetInnerHTML={{ __html: exam.instructions }} />
          ) : exam.description ? (
            <p>{exam.description}</p>
          ) : (
            <p>No specific instructions provided. Please read all questions carefully before answering.</p>
          )}
        </div>
      </div>

      {/* Important Rules */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">⚠️</span> Important Rules
        </div>
        <div className="lms-info-box-body" style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <ul className="guidelines-list">
            <li className="guideline-item">
              <span className="guideline-icon active">1</span>
              <strong>Timed exam:</strong> Once started, the timer cannot be paused. You have {exam.duration} minutes.
            </li>
            <li className="guideline-item">
              <span className="guideline-icon active">2</span>
              <strong>Auto-save:</strong> Your answers are automatically saved every 30 seconds.
            </li>
            <li className="guideline-item">
              <span className="guideline-icon violation">3</span>
              <strong>Proctoring active:</strong> Camera, microphone, and fullscreen are required during the exam.
            </li>
            <li className="guideline-item">
              <span className="guideline-icon violation">4</span>
              Tab switches, copy/paste, right-click, and keyboard shortcuts are blocked and logged.
            </li>
            <li className="guideline-item">
              <span className="guideline-icon terminate">5</span>
              Maximum 5 violations are allowed — the exam auto-submits after that.
            </li>
            {(exam.shuffleQuestions || exam.randomizeQuestions) && (
              <li className="guideline-item">
                <span className="guideline-icon idle">6</span>
                Questions will be shuffled for each attempt.
              </li>
            )}
            {(exam.negativeMarking) && (
              <li className="guideline-item">
                <span className="guideline-icon violation">7</span>
                <strong>Negative marking:</strong> Incorrect answers will deduct marks.
              </li>
            )}
            <li className="guideline-item">
              <span className="guideline-icon submit">8</span>
              Calculator: <strong>{exam.calculatorEnabled ? (exam.calculatorType || 'Basic') : 'Not allowed'}</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Review Settings */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.25s' }}>
        <div className="lms-section-title"><span className="section-icon">🔍</span> Review Options</div>
        <div className="lms-info-box-body" style={{ fontSize: '13px' }}>
          {exam.allowReview ? (
            <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '2' }}>
              <li>Review: <strong>Available after completion</strong></li>
              <li>Show correct answers: <strong>{exam.showCorrectAnswers ? 'Yes' : 'No'}</strong></li>
              <li>Show explanations: <strong>{exam.showExplanations ? 'Yes' : 'No'}</strong></li>
            </ul>
          ) : (
            <p>Review is not enabled for this examination.</p>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="lms-section-title"><span className="section-icon">🚀</span> Start Examination</div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
            Attempts used: <strong>{attemptCount}</strong> of <strong>{exam.maxAttempts}</strong>
            {remainingAttempts > 0 && <span> · {remainingAttempts} remaining</span>}
          </p>

          {hasActiveAttempt ? (
            <div>
              <p style={{ marginBottom: '12px', color: 'var(--warning)', fontWeight: 'bold' }}>
                ⚠️ You have an active attempt in progress.
              </p>
              <Link
                href={`/my/exams/${examId}/attempt`}
                className="lms-btn lms-btn-primary"
                style={{ padding: '14px 40px', fontSize: '16px' }}
              >
                ▶ Resume Examination
              </Link>
            </div>
          ) : canAttempt ? (
            <div>
              {!showStartModal ? (
                <button
                  className="lms-btn lms-btn-success"
                  style={{ padding: '14px 40px', fontSize: '16px' }}
                  onClick={() => setShowStartModal(true)}
                >
                  ▶ Start New Attempt
                </button>
              ) : (
                <div className="lms-info-box" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
                  <div className="lms-info-box-header" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
                    ⚠️ Confirm Start
                  </div>
                  <div className="lms-info-box-body">
                    <p style={{ marginBottom: '12px' }}>You are about to start <strong>{exam.title}</strong>.</p>
                    <ul style={{ paddingLeft: '20px', fontSize: '12px', marginBottom: '16px', lineHeight: '1.8' }}>
                      <li>The timer starts immediately and cannot be paused</li>
                      <li>You have <strong>{exam.duration} minutes</strong> to complete the exam</li>
                      <li>Camera, microphone, and fullscreen will be activated</li>
                      <li>Ensure stable internet before proceeding</li>
                    </ul>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button className="lms-btn" onClick={() => setShowStartModal(false)}>Cancel</button>
                      <button
                        className="lms-btn lms-btn-success"
                        onClick={handleStartAttempt}
                        disabled={isStarting}
                      >
                        {isStarting ? 'Starting...' : '✓ Confirm — Start Exam'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="lms-btn" disabled style={{ padding: '14px 40px', fontSize: '16px', opacity: 0.5 }}>
              {!hasAttemptsRemaining ? 'No Attempts Remaining' : isUpcoming ? 'Not Yet Open' : 'Examination Closed'}
            </button>
          )}

          <div style={{ marginTop: '16px' }}>
            <Link href="/my/exams" className="lms-btn lms-btn-sm" style={{ marginRight: '8px' }}>← Back to Examinations</Link>
            <Link href="/my" className="lms-btn lms-btn-sm">Dashboard</Link>
          </div>
        </div>
      </div>
    </LMSLayout>
  );
}
