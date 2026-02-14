'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Exam status type matching backend
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

// Status transition rules
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
  draft: {
    canEdit: true,
    canAddQuestions: true,
    canPublish: true,
    canActivate: false,
    canComplete: false,
    canLock: false,
    canDelete: true,
    canViewResults: false,
  },
  published: {
    canEdit: false,
    canAddQuestions: false,
    canPublish: false,
    canActivate: true,
    canComplete: false,
    canLock: false,
    canDelete: false,
    canViewResults: false,
  },
  ongoing: {
    canEdit: false,
    canAddQuestions: false,
    canPublish: false,
    canActivate: false,
    canComplete: true,
    canLock: false,
    canDelete: false,
    canViewResults: false,
  },
  completed: {
    canEdit: false,
    canAddQuestions: false,
    canPublish: false,
    canActivate: false,
    canComplete: false,
    canLock: true,
    canDelete: false,
    canViewResults: true,
  },
  archived: {
    canEdit: false,
    canAddQuestions: false,
    canPublish: false,
    canActivate: false,
    canComplete: false,
    canLock: false,
    canDelete: false,
    canViewResults: true,
  },
};

export default function AdminExamsPage() {
  const searchParams = useSearchParams();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [examForAction, setExamForAction] = useState<Exam | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch server time and sync every 30 seconds
  const fetchServerTime = useCallback(async () => {
    try {
      const response = await api.get('/admin/server-time');
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
      
      const response = await api.get(`/admin/exams?${params.toString()}`);
      setExams(response.data.data.exams || []);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      toast.error('Failed to load examinations');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleDelete = async () => {
    if (!examToDelete) return;
    
    const actions = STATUS_ACTIONS[examToDelete.status];
    if (!actions.canDelete) {
      toast.error('Cannot delete examination in this state');
      return;
    }

    setIsProcessing(true);
    try {
      await api.delete(`/admin/exams/${examToDelete._id}`);
      setExams(exams.filter(e => e._id !== examToDelete._id));
      setShowDeleteModal(false);
      setExamToDelete(null);
      toast.success('Examination deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete examination');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusAction = async () => {
    if (!examForAction || !actionType) return;

    setIsProcessing(true);
    try {
      let endpoint = '';
      let successMessage = '';

      switch (actionType) {
        case 'publish':
          endpoint = `/admin/exams/${examForAction._id}/publish`;
          successMessage = 'Examination published. Configuration is now LOCKED.';
          break;
        case 'activate':
          endpoint = `/admin/exams/${examForAction._id}/activate`;
          successMessage = 'Examination activated. Students can now login.';
          break;
        case 'complete':
          endpoint = `/admin/exams/${examForAction._id}/complete`;
          successMessage = 'Examination completed. All sessions force-submitted.';
          break;
        case 'lock':
          endpoint = `/admin/exams/${examForAction._id}/lock`;
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
        warning: 'Students will be able to start the examination immediately. Make sure the exam window is correct.',
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
    exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (exam.courseCode && exam.courseCode.toLowerCase().includes(searchQuery.toLowerCase()))
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
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <Link href={`/admin/exams/${exam._id}`} className="lms-btn lms-btn-sm">
          {actions.canEdit ? 'Edit' : 'View'}
        </Link>

        {actions.canAddQuestions && (
          <Link href={`/admin/exams/${exam._id}/questions/add`} className="lms-btn lms-btn-sm">
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
          <Link href={`/admin/exams/${exam._id}/results`} className="lms-btn lms-btn-sm">
            Results
          </Link>
        )}

        {actions.canLock && (
          <button onClick={() => openActionModal(exam, 'lock')} className="lms-btn lms-btn-sm">
            Lock
          </button>
        )}

        {actions.canDelete && (
          <button onClick={() => { setExamToDelete(exam); setShowDeleteModal(true); }} className="lms-btn lms-btn-sm lms-btn-danger">
            Delete
          </button>
        )}

        {exam.status === 'ongoing' && (
          <Link href={`/admin/monitor?examId=${exam._id}`} className="lms-btn lms-btn-sm lms-btn-primary">
            Monitor
          </Link>
        )}
      </div>
    );
  };

  const actionModalContent = getActionModalContent();

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Examination Management">
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading examinations...</span>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Examination Management"
      breadcrumbs={[{ label: 'Administration' }, { label: 'Examinations' }]}
    >
      {/* Server Time Banner */}
      <div className="lms-info-box animate-fadeInDown" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)', color: '#fff' }}>
        <div className="lms-info-box-body flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-6 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <span className="live-indicator"></span>
              <span className="font-medium">EXAM CENTER</span>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>🕐 Server Time:</span>
              <span className="font-mono ml-2 pulse-text">{format(serverTime, 'dd MMM yyyy, HH:mm:ss')}</span>
            </div>
          </div>
          <Link href="/admin/exams/create" className="lms-btn btn-pulse" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
            ➕ Create Examination
          </Link>
        </div>
      </div>

      {/* Active Exams Alert */}
      {activeExams.length > 0 && (
        <div className="live-exam-alert animate-pulse-border animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="live-indicator"></span>
            <span className="font-semibold">⚠️ LIVE EXAMINATION IN PROGRESS</span>
          </div>
          <span className="text-sm">{activeExams.length} examination(s) currently active. Students are taking exams.</span>
          <Link href="/admin/monitor" className="lms-btn lms-btn-sm" style={{ marginTop: '8px' }}>🖥️ Open Live Monitor</Link>
        </div>
      )}

      {/* Stats Cards */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-icon">📋</div>
          <div className="lms-stat-value">{exams.length}</div>
          <div className="lms-stat-label">Total Exams</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.15s', position: 'relative' }}>
          <div className="lms-stat-icon">🟢</div>
          <div className="lms-stat-value">{activeExams.length}</div>
          <div className="lms-stat-label">Active Now</div>
          {activeExams.length > 0 && <div className="live-indicator" style={{ position: 'absolute', top: '10px', right: '10px' }}></div>}
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon">📢</div>
          <div className="lms-stat-value">{exams.filter(e => e.status === 'published').length}</div>
          <div className="lms-stat-label">Published</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">📝</div>
          <div className="lms-stat-value">{exams.filter(e => e.status === 'draft').length}</div>
          <div className="lms-stat-label">Draft</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="lms-stat-icon">✅</div>
          <div className="lms-stat-value">{exams.filter(e => ['completed', 'archived'].includes(e.status)).length}</div>
          <div className="lms-stat-label">Completed</div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.35s' }}>
        <div className="lms-section-title"><span className="section-icon">🔍</span> Filter & Search</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="lms-form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="lms-label">Search</label>
            <input type="text" className="lms-input" placeholder="Search exams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="lms-form-group" style={{ margin: 0, width: '150px' }}>
            <label className="lms-label">Status</label>
            <select className="lms-select" title="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="draft">📝 Draft</option>
              <option value="published">📢 Published</option>
              <option value="ongoing">🟢 Active</option>
              <option value="completed">✅ Completed</option>
              <option value="archived">🔒 Locked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lifecycle Info */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.4s', marginBottom: '16px' }}>
        <div className="lms-info-box-header"><span className="section-icon">📖</span> Examination Lifecycle</div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="lms-status">📝 DRAFT</span><span>→</span>
            <span className="lms-status lms-status-info">📢 PUBLISHED</span><span>→</span>
            <span className="lms-status lms-status-active">🟢 ACTIVE</span><span>→</span>
            <span className="lms-status lms-status-success">✅ COMPLETED</span><span>→</span>
            <span className="lms-status lms-status-closed">🔒 LOCKED</span>
          </div>
        </div>
      </div>

      {activeExams.length > 0 && (
        <div className="lms-section">
          <div className="lms-section-title" style={{ color: 'var(--success)' }}>🔴 Active Examinations (READ-ONLY)</div>
          <div className="lms-table-container">
            <table className="lms-table">
              <thead><tr><th>Code</th><th>Title</th><th>Subject</th><th>End Time</th><th>Questions</th><th>Submissions</th><th>Actions</th></tr></thead>
              <tbody>
                {activeExams.map((exam) => (
                  <tr key={exam._id} style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
                    <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                    <td><Link href={`/admin/exams/${exam._id}`} style={{ color: 'var(--link-color)' }}>{exam.title}</Link></td>
                    <td>{exam.subject}</td>
                    <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM/yyyy HH:mm')}</td>
                    <td>{exam.questionsCount || 0}</td>
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
        <div className="lms-section-title">{statusFilter === 'all' ? 'All Examinations' : `${statusFilter} Examinations`}</div>
        {isLoading ? (
          <div className="lms-loading">Loading examinations...</div>
        ) : otherExams.length === 0 && activeExams.length === 0 ? (
          <div className="lms-table-empty">No examinations found. <Link href="/admin/exams/create" style={{ color: 'var(--link-color)' }}>Create new</Link></div>
        ) : otherExams.length === 0 ? (
          <div className="lms-table-empty">No other examinations in this filter.</div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead><tr><th>Code</th><th>Title</th><th>Subject</th><th>Duration</th><th>Window Open</th><th>Window Close</th><th>Questions</th><th>Submissions</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {otherExams.map((exam) => {
                  const statusDisplay = getStatusDisplay(exam.status);
                  return (
                    <tr key={exam._id}>
                      <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                      <td><Link href={`/admin/exams/${exam._id}`} style={{ color: 'var(--link-color)' }}>{exam.title}</Link></td>
                      <td>{exam.subject}</td>
                      <td>{exam.duration} min</td>
                      <td className="font-mono">{format(new Date(exam.startTime), 'dd/MM/yy HH:mm')}</td>
                      <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM/yy HH:mm')}</td>
                      <td>{exam.questionsCount || 0}</td>
                      <td>{exam.submissionsCount || 0}</td>
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

      <div className="lms-info-box">
        <div className="lms-info-box-header">Batch Controller Guidelines</div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>Maximum batch size: <strong>500 students</strong></li>
            <li>Active examinations are <strong>READ-ONLY</strong>.</li>
            <li>Results are <strong>immutable</strong> once exam is locked.</li>
          </ul>
        </div>
      </div>

      {showDeleteModal && examToDelete && (
        <div className="lms-modal-overlay">
          <div className="lms-modal">
            <div className="lms-modal-header">Confirm Delete</div>
            <div className="lms-modal-body">
              <p>Delete <strong>&quot;{examToDelete.title}&quot;</strong>?</p>
              <p style={{ marginTop: '8px', color: 'var(--error)' }}>This action cannot be undone.</p>
            </div>
            <div className="lms-modal-footer">
              <button onClick={() => { setShowDeleteModal(false); setExamToDelete(null); }} className="lms-btn" disabled={isProcessing}>Cancel</button>
              <button onClick={handleDelete} className="lms-btn lms-btn-danger" disabled={isProcessing}>{isProcessing ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {showActionModal && examForAction && (
        <div className="lms-modal-overlay">
          <div className="lms-modal">
            <div className="lms-modal-header">{actionModalContent.title}</div>
            <div className="lms-modal-body">
              <p>{actionModalContent.message}</p>
              <div className="lms-alert lms-alert-warning" style={{ marginTop: '12px' }}><strong>⚠ Warning:</strong> {actionModalContent.warning}</div>
            </div>
            <div className="lms-modal-footer">
              <button onClick={() => { setShowActionModal(false); setExamForAction(null); setActionType(''); }} className="lms-btn" disabled={isProcessing}>Cancel</button>
              <button onClick={handleStatusAction} className={`lms-btn ${['complete', 'lock'].includes(actionType) ? 'lms-btn-danger' : 'lms-btn-primary'}`} disabled={isProcessing}>{isProcessing ? 'Processing...' : `Confirm`}</button>
            </div>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
