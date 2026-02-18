'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type ExamStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

interface Exam {
  _id: string;
  title: string;
  subject: string;
  courseCode?: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  startTime: string;
  endTime: string;
  status: ExamStatus;
  questionsCount?: number;
  submissionsCount?: number;
  batchSize?: number;
  enableBatching?: boolean;
  createdAt: string;
}

const STATUS_ACTIONS: Record<ExamStatus, {
  canEdit: boolean;
  canAddQuestions: boolean;
  canPublish: boolean;
  canActivate: boolean;
  canComplete: boolean;
  canLock: boolean;
  canDelete: boolean;
  canViewResults: boolean;
}> = {
  draft: { canEdit: true, canAddQuestions: true, canPublish: true, canActivate: false, canComplete: false, canLock: false, canDelete: true, canViewResults: false },
  published: { canEdit: false, canAddQuestions: false, canPublish: false, canActivate: true, canComplete: false, canLock: false, canDelete: false, canViewResults: false },
  ongoing: { canEdit: false, canAddQuestions: false, canPublish: false, canActivate: false, canComplete: true, canLock: false, canDelete: false, canViewResults: false },
  completed: { canEdit: false, canAddQuestions: false, canPublish: false, canActivate: false, canComplete: false, canLock: true, canDelete: false, canViewResults: true },
  archived: { canEdit: false, canAddQuestions: false, canPublish: false, canActivate: false, canComplete: false, canLock: false, canDelete: false, canViewResults: true },
};

export default function TeacherExamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [showActionModal, setShowActionModal] = useState(false);
  const [examForAction, setExamForAction] = useState<Exam | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push('/my');
    }
  }, [isAuthenticated, user, router]);

  const fetchServerTime = useCallback(async () => {
    try {
      const response = await api.get('/teacher/server-time');
      setServerTime(new Date(response.data.data.serverTime));
    } catch {
      setServerTime(new Date());
    }
  }, []);

  useEffect(() => {
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 30000);
    return () => clearInterval(interval);
  }, [fetchServerTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await api.get(`/teacher/exams?${params.toString()}`);
      setExams(response.data.data.exams || []);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      toast.error('Failed to load examinations');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher')) {
      fetchExams();
    }
  }, [fetchExams, isAuthenticated, user]);

  const handleStatusAction = async () => {
    if (!examForAction || !actionType) return;

    setIsProcessing(true);
    try {
      let endpoint = '';
      let successMessage = '';

      switch (actionType) {
        case 'publish':
          endpoint = `/teacher/exams/${examForAction._id}/publish`;
          successMessage = 'Examination published. Configuration is now LOCKED.';
          break;
        case 'activate':
          endpoint = `/teacher/exams/${examForAction._id}/activate`;
          successMessage = 'Examination activated. Students can now login.';
          break;
        case 'complete':
          endpoint = `/teacher/exams/${examForAction._id}/complete`;
          successMessage = 'Examination completed. All sessions force-submitted.';
          break;
        case 'lock':
          endpoint = `/teacher/exams/${examForAction._id}/lock`;
          successMessage = 'Examination locked permanently.';
          break;
        default:
          throw new Error('Unknown action');
      }

      await api.post(endpoint);
      toast.success(successMessage);
      setShowActionModal(false);
      setExamForAction(null);
      setActionType('');
      fetchExams();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${actionType} examination`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionModal = (exam: Exam, action: string) => {
    setExamForAction(exam);
    setActionType(action);
    setShowActionModal(true);
  };

  const getActionModalContent = () => {
    if (!examForAction || !actionType) return { title: '', message: '', warning: '' };

    const configs: Record<string, { title: string; message: string; warning: string }> = {
      publish: {
        title: 'Publish Examination',
        message: `Are you sure you want to publish "${examForAction.title}"?`,
        warning: 'This will LOCK the exam configuration. You will NOT be able to edit questions, duration, or timing after publishing.',
      },
      activate: {
        title: 'Activate Examination',
        message: `Are you sure you want to activate "${examForAction.title}"?`,
        warning: 'Students will be able to start the examination immediately.',
      },
      complete: {
        title: 'Complete Examination',
        message: `Are you sure you want to complete "${examForAction.title}"?`,
        warning: 'ALL active sessions will be FORCE SUBMITTED. This action cannot be undone.',
      },
      lock: {
        title: 'Lock Examination',
        message: `Are you sure you want to permanently lock "${examForAction.title}"?`,
        warning: 'The examination will be archived. Results remain viewable but no modifications allowed.',
      },
    };

    return configs[actionType] || { title: '', message: '', warning: '' };
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeExams = filteredExams.filter(e => e.status === 'ongoing');
  const otherExams = filteredExams.filter(e => e.status !== 'ongoing');

  const getStatusDisplay = (status: ExamStatus) => {
    const displays: Record<ExamStatus, { label: string; className: string }> = {
      draft: { label: 'DRAFT', className: '' },
      published: { label: 'PUBLISHED', className: 'lms-status-info' },
      ongoing: { label: 'ACTIVE', className: 'lms-status-active' },
      completed: { label: 'COMPLETED', className: 'lms-status-success' },
      archived: { label: 'LOCKED', className: 'lms-status-closed' },
    };
    return displays[status] || { label: status.toUpperCase(), className: '' };
  };

  const renderActions = (exam: Exam) => {
    const actions = STATUS_ACTIONS[exam.status];
    const questionsCount = exam.questionsCount || 0;

    return (
      <div className="flex gap-1 flex-wrap">
        <Link href={`/teacher/exams/${exam._id}`} className="lms-btn lms-btn-sm">
          {actions.canEdit ? 'Edit' : 'View'}
        </Link>

        {actions.canAddQuestions && (
          <Link href={`/teacher/exams/${exam._id}/questions`} className="lms-btn lms-btn-sm">
            Questions
          </Link>
        )}

        {actions.canPublish && questionsCount > 0 && (
          <button onClick={() => openActionModal(exam, 'publish')} className="lms-btn lms-btn-sm lms-btn-primary">
            Publish
          </button>
        )}

        {actions.canActivate && (
          <button onClick={() => openActionModal(exam, 'activate')} className="lms-btn lms-btn-sm lms-btn-warning">
            Activate
          </button>
        )}

        {actions.canComplete && (
          <button onClick={() => openActionModal(exam, 'complete')} className="lms-btn lms-btn-sm lms-btn-danger">
            Complete
          </button>
        )}

        {actions.canViewResults && (
          <Link href={`/teacher/exams/${exam._id}/results`} className="lms-btn lms-btn-sm">
            Results
          </Link>
        )}

        {exam.status === 'ongoing' && (
          <Link href={`/teacher/exams/${exam._id}/monitor`} className="lms-btn lms-btn-sm lms-btn-primary">
            Monitor
          </Link>
        )}
      </div>
    );
  };

  const actionModalContent = getActionModalContent();

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'teacher')) {
    return null;
  }

  return (
    <LMSLayout
      pageTitle="My Examinations"
      breadcrumbs={[{ label: 'Teacher' }, { label: 'Examinations' }]}
    >
      <div className="lms-info-box mb-4">
        <div className="lms-info-box-body">
          <div className="lms-info-row">
            <div className="lms-info-label">Server Time:</div>
            <div className="lms-info-value font-mono">{format(serverTime, 'dd MMM yyyy, HH:mm:ss')}</div>
          </div>
        </div>
      </div>

      {activeExams.length > 0 && (
        <div className="lms-alert lms-alert-warning">
          <div className="lms-alert-title">⚠ LIVE EXAMINATION IN PROGRESS</div>
          <div>{activeExams.length} examination(s) currently active.</div>
        </div>
      )}

      <div className="lms-section">
        <div className="lms-section-title">Filter &amp; Search</div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="lms-form-group m-0 flex-1 min-w-[200px]">
            <label className="lms-label">Search</label>
            <input 
              type="text" 
              className="lms-input" 
              placeholder="Search exams..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <div className="lms-form-group m-0 w-[150px]">
            <label className="lms-label">Status</label>
            <select 
              className="lms-select" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="ongoing">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Locked</option>
            </select>
          </div>
          <Link href="/teacher/exams/create" className="lms-btn lms-btn-primary">
            Create Examination
          </Link>
        </div>
      </div>

      <div className="lms-stats-row">
        <div className="lms-stat">
          <div className="lms-stat-value">{exams.length}</div>
          <div className="lms-stat-label">Total</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value" style={{ color: activeExams.length > 0 ? 'var(--success)' : undefined }}>
            {activeExams.length}
          </div>
          <div className="lms-stat-label">Active</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{exams.filter(e => e.status === 'published').length}</div>
          <div className="lms-stat-label">Published</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{exams.filter(e => e.status === 'draft').length}</div>
          <div className="lms-stat-label">Draft</div>
        </div>
      </div>

      <div className="lms-info-box mb-4">
        <div className="lms-info-box-header">Examination Lifecycle</div>
        <div className="lms-info-box-body text-xs">
          <div className="flex gap-2 items-center flex-wrap">
            <span className="lms-status">DRAFT</span><span>→</span>
            <span className="lms-status lms-status-info">PUBLISHED</span><span>→</span>
            <span className="lms-status lms-status-active">ACTIVE</span><span>→</span>
            <span className="lms-status lms-status-success">COMPLETED</span><span>→</span>
            <span className="lms-status lms-status-closed">LOCKED</span>
          </div>
        </div>
      </div>

      {activeExams.length > 0 && (
        <div className="lms-section">
          <div className="lms-section-title" style={{ color: 'var(--success)' }}>🔴 Active Examinations</div>
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>End Time</th>
                  <th>Submissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeExams.map((exam) => (
                  <tr key={exam._id} style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
                    <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                    <td>{exam.title}</td>
                    <td>{exam.subject}</td>
                    <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM/yyyy HH:mm')}</td>
                    <td>{exam.submissionsCount || 0}</td>
                    <td>{renderActions(exam)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="lms-section">
        <div className="lms-section-title">
          {statusFilter === 'all' ? 'All Examinations' : `${statusFilter} Examinations`}
        </div>
        {isLoading ? (
          <div className="lms-loading">Loading examinations...</div>
        ) : otherExams.length === 0 && activeExams.length === 0 ? (
          <div className="lms-table-empty">
            No examinations found. <Link href="/teacher/exams/create" style={{ color: 'var(--link-color)' }}>Create new</Link>
          </div>
        ) : otherExams.length === 0 ? (
          <div className="lms-table-empty">No other examinations in this filter.</div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Duration</th>
                  <th>Window Open</th>
                  <th>Window Close</th>
                  <th>Questions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {otherExams.map((exam) => {
                  const statusDisplay = getStatusDisplay(exam.status);
                  return (
                    <tr key={exam._id}>
                      <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                      <td>
                        <Link href={`/teacher/exams/${exam._id}`} style={{ color: 'var(--link-color)' }}>
                          {exam.title}
                        </Link>
                      </td>
                      <td>{exam.subject}</td>
                      <td>{exam.duration} min</td>
                      <td className="font-mono">{format(new Date(exam.startTime), 'dd/MM/yy HH:mm')}</td>
                      <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM/yy HH:mm')}</td>
                      <td>{exam.questionsCount || 0}</td>
                      <td><span className={`lms-status ${statusDisplay.className}`}>{statusDisplay.label}</span></td>
                      <td>{renderActions(exam)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showActionModal && examForAction && (
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
                onClick={() => { setShowActionModal(false); setExamForAction(null); setActionType(''); }} 
                className="lms-btn" 
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                onClick={handleStatusAction} 
                className={`lms-btn ${['complete', 'lock'].includes(actionType) ? 'lms-btn-danger' : 'lms-btn-primary'}`} 
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
