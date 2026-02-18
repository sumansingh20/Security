'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Question {
  _id: string;
  questionText: string;
  questionType: 'mcq-single' | 'mcq-multiple' | 'true-false';
  marks: number;
  options?: { text: string; isCorrect: boolean }[];
}

interface Exam {
  _id: string;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  courseCode?: string;
  duration: number;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  calculatorType: 'none' | 'basic' | 'scientific';
  enableProctoring: boolean;
  detectTabSwitch: boolean;
  detectCopyPaste: boolean;
  maxViolationsBeforeSubmit: number;
  blockRightClick: boolean;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
  questionsCount?: number;
  submissionsCount?: number;
  questions?: Question[];
}

const STATUS_CONFIG: Record<string, {
  label: string;
  class: string;
  canEdit: boolean;
  canAddQuestions: boolean;
  canPublish: boolean;
  canActivate: boolean;
  canComplete: boolean;
}> = {
  draft: { label: 'DRAFT', class: '', canEdit: true, canAddQuestions: true, canPublish: true, canActivate: false, canComplete: false },
  published: { label: 'PUBLISHED', class: 'lms-status-info', canEdit: false, canAddQuestions: false, canPublish: false, canActivate: true, canComplete: false },
  ongoing: { label: 'ACTIVE', class: 'lms-status-active', canEdit: false, canAddQuestions: false, canPublish: false, canActivate: false, canComplete: true },
  completed: { label: 'COMPLETED', class: 'lms-status-success', canEdit: false, canAddQuestions: false, canPublish: false, canActivate: false, canComplete: false },
  archived: { label: 'LOCKED', class: 'lms-status-closed', canEdit: false, canAddQuestions: false, canPublish: false, canActivate: false, canComplete: false },
};

export default function TeacherExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user, isAuthenticated } = useAuthStore();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push('/my');
    }
  }, [isAuthenticated, user, router]);

  const fetchExam = useCallback(async () => {
    try {
      const response = await api.get(`/teacher/exams/${examId}`);
      const examData = response.data.data.exam;
      const questionsData = response.data.data.questions || [];
      setExam(examData);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Failed to fetch exam:', error);
      toast.error('Failed to load examination');
      router.push('/teacher/exams');
    } finally {
      setIsLoading(false);
    }
  }, [examId, router]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher')) {
      fetchExam();
    }
  }, [fetchExam, isAuthenticated, user]);

  const handleSave = async () => {
    if (!exam) return;
    
    setIsSaving(true);
    try {
      await api.put(`/teacher/exams/${examId}`, exam);
      toast.success('Examination settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save examination');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusAction = async () => {
    if (!exam || !actionType) return;

    setIsProcessing(true);
    try {
      let endpoint = '';
      let successMessage = '';

      switch (actionType) {
        case 'publish':
          endpoint = `/teacher/exams/${examId}/publish`;
          successMessage = 'Examination published. Configuration is now LOCKED.';
          break;
        case 'activate':
          endpoint = `/teacher/exams/${examId}/activate`;
          successMessage = 'Examination activated. Students can now login.';
          break;
        case 'complete':
          endpoint = `/teacher/exams/${examId}/complete`;
          successMessage = 'Examination completed. All sessions force-submitted.';
          break;
        default:
          throw new Error('Unknown action');
      }

      await api.post(endpoint);
      toast.success(successMessage);
      setShowActionModal(false);
      setActionType('');
      fetchExam();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${actionType} examination`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionModal = (action: string) => {
    setActionType(action);
    setShowActionModal(true);
  };

  const getActionModalContent = () => {
    if (!exam || !actionType) return { title: '', message: '', warning: '' };

    const configs: Record<string, { title: string; message: string; warning: string }> = {
      publish: {
        title: 'Publish Examination',
        message: `Are you sure you want to publish "${exam.title}"?`,
        warning: 'This will LOCK the exam configuration. You will NOT be able to edit questions, duration, or timing after publishing.',
      },
      activate: {
        title: 'Activate Examination',
        message: `Are you sure you want to activate "${exam.title}"?`,
        warning: 'Students will be able to start the examination immediately.',
      },
      complete: {
        title: 'Complete Examination',
        message: `Are you sure you want to complete "${exam.title}"?`,
        warning: 'ALL active sessions will be FORCE SUBMITTED. This action cannot be undone.',
      },
    };

    return configs[actionType] || { title: '', message: '', warning: '' };
  };

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'teacher')) {
    return null;
  }

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Loading...">
        <div className="lms-loading">Loading examination details...</div>
      </LMSLayout>
    );
  }

  if (!exam) {
    return (
      <LMSLayout pageTitle="Examination Not Found">
        <div className="lms-alert lms-alert-error">Examination not found.</div>
      </LMSLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[exam.status] || STATUS_CONFIG.draft;
  const actionModalContent = getActionModalContent();

  return (
    <LMSLayout
      pageTitle={exam.title}
      breadcrumbs={[
        { label: 'Teacher' },
        { label: 'Examinations', href: '/teacher/exams' },
        { label: exam.title }
      ]}
    >
      {/* Status Banner */}
      <div className="lms-info-box mb-4">
        <div className="lms-info-box-body">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`lms-status ${statusConfig.class}`}>{statusConfig.label}</span>
              <span className="text-sm text-gray-500">
                {exam.questionsCount || questions.length} Questions | {exam.duration} minutes
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusConfig.canEdit && (
                <button onClick={handleSave} disabled={isSaving} className="lms-btn lms-btn-primary">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              {statusConfig.canAddQuestions && (
                <Link href={`/teacher/exams/${examId}/questions`} className="lms-btn">
                  Manage Questions
                </Link>
              )}
              {statusConfig.canPublish && questions.length > 0 && (
                <button onClick={() => openActionModal('publish')} className="lms-btn lms-btn-warning">
                  Publish
                </button>
              )}
              {statusConfig.canActivate && (
                <button onClick={() => openActionModal('activate')} className="lms-btn lms-btn-warning">
                  Activate
                </button>
              )}
              {statusConfig.canComplete && (
                <button onClick={() => openActionModal('complete')} className="lms-btn lms-btn-danger">
                  Complete
                </button>
              )}
              {exam.status === 'ongoing' && (
                <Link href={`/teacher/exams/${examId}/monitor`} className="lms-btn lms-btn-primary">
                  Live Monitor
                </Link>
              )}
              {['completed', 'archived'].includes(exam.status) && (
                <Link href={`/teacher/exams/${examId}/results`} className="lms-btn">
                  View Results
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Read-Only Warning */}
      {!statusConfig.canEdit && (
        <div className="lms-alert lms-alert-warning mb-4">
          <strong>Read Only:</strong> This examination cannot be modified in its current state ({statusConfig.label}).
        </div>
      )}

      {/* Exam Details */}
      <div className="lms-section">
        <div className="lms-section-title">General Information</div>
        <div className="lms-info-box">
          <div className="lms-info-box-body">
            <div className="lms-info-row">
              <div className="lms-info-label">Title:</div>
              <div className="lms-info-value">{exam.title}</div>
            </div>
            <div className="lms-info-row">
              <div className="lms-info-label">Subject:</div>
              <div className="lms-info-value">{exam.subject}</div>
            </div>
            {exam.courseCode && (
              <div className="lms-info-row">
                <div className="lms-info-label">Course Code:</div>
                <div className="lms-info-value">{exam.courseCode}</div>
              </div>
            )}
            {exam.description && (
              <div className="lms-info-row">
                <div className="lms-info-label">Description:</div>
                <div className="lms-info-value">{exam.description}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lms-section">
        <div className="lms-section-title">Timing</div>
        <div className="lms-info-box">
          <div className="lms-info-box-body">
            <div className="lms-info-row">
              <div className="lms-info-label">Duration:</div>
              <div className="lms-info-value">{exam.duration} minutes</div>
            </div>
            <div className="lms-info-row">
              <div className="lms-info-label">Window Opens:</div>
              <div className="lms-info-value font-mono">{format(new Date(exam.startTime), 'dd MMM yyyy, HH:mm')}</div>
            </div>
            <div className="lms-info-row">
              <div className="lms-info-label">Window Closes:</div>
              <div className="lms-info-value font-mono">{format(new Date(exam.endTime), 'dd MMM yyyy, HH:mm')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lms-section">
        <div className="lms-section-title">Marks</div>
        <div className="lms-info-box">
          <div className="lms-info-box-body">
            <div className="lms-info-row">
              <div className="lms-info-label">Total Marks:</div>
              <div className="lms-info-value">{exam.totalMarks}</div>
            </div>
            <div className="lms-info-row">
              <div className="lms-info-label">Passing Marks:</div>
              <div className="lms-info-value">{exam.passingMarks}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lms-section">
        <div className="lms-section-title">Proctoring Settings</div>
        <div className="lms-info-box">
          <div className="lms-info-box-body text-sm">
            <div className="flex flex-wrap gap-4">
              <div>Proctoring: <strong>{exam.enableProctoring ? 'Enabled' : 'Disabled'}</strong></div>
              <div>Tab Switch Detection: <strong>{exam.detectTabSwitch ? 'Enabled' : 'Disabled'}</strong></div>
              <div>Copy/Paste Block: <strong>{exam.detectCopyPaste ? 'Enabled' : 'Disabled'}</strong></div>
              <div>Max Violations: <strong>{exam.maxViolationsBeforeSubmit}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Preview */}
      <div className="lms-section">
        <div className="lms-section-title">
          Questions ({questions.length})
          {statusConfig.canAddQuestions && (
            <Link href={`/teacher/exams/${examId}/questions`} className="lms-btn lms-btn-sm ml-4">
              Manage Questions
            </Link>
          )}
        </div>
        {questions.length === 0 ? (
          <div className="lms-alert lms-alert-info">
            No questions added yet. 
            {statusConfig.canAddQuestions && (
              <Link href={`/teacher/exams/${examId}/questions`} className="ml-2" style={{ color: 'var(--link-color)' }}>
                Add questions
              </Link>
            )}
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {questions.slice(0, 10).map((q, idx) => (
                  <tr key={q._id}>
                    <td>{idx + 1}</td>
                    <td className="max-w-md truncate">{q.questionText.slice(0, 100)}...</td>
                    <td>{q.questionType}</td>
                    <td>{q.marks}</td>
                  </tr>
                ))}
                {questions.length > 10 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500">
                      ... and {questions.length - 10} more questions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="lms-section">
        <div className="lms-section-title">Quick Actions</div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/teacher/exams/${examId}/violations`} className="lms-btn">
            View Violations
          </Link>
          <Link href={`/teacher/exams/${examId}/results`} className="lms-btn">
            View Results
          </Link>
          <Link href="/teacher/exams" className="lms-btn">
            Back to Examinations
          </Link>
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="lms-modal-overlay">
          <div className="lms-modal">
            <div className="lms-modal-header">{actionModalContent.title}</div>
            <div className="lms-modal-body">
              <p>{actionModalContent.message}</p>
              <div className="lms-alert lms-alert-warning mt-3">
                <strong>⚠ Warning:</strong> {actionModalContent.warning}
              </div>
            </div>
            <div className="lms-modal-footer">
              <button 
                onClick={() => { setShowActionModal(false); setActionType(''); }} 
                className="lms-btn" 
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                onClick={handleStatusAction} 
                className={`lms-btn ${actionType === 'complete' ? 'lms-btn-danger' : 'lms-btn-primary'}`} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
