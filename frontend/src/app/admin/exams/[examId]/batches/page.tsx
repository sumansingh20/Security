'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Batch {
  _id: string;
  batchNumber: number;
  rollNumberStart: string;
  rollNumberEnd: string;
  maxCapacity: number;
  currentCount: number;
  totalEnrolled: number;
  totalAttempted: number;
  totalSubmitted: number;
  totalViolations: number;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'pending' | 'queued' | 'active' | 'completed' | 'locked';
  isLocked: boolean;
}

interface ExamInfo {
  _id: string;
  title: string;
  status: string;
  enableBatching: boolean;
  batchSize: number;
}

export default function BatchesPage() {
  const params = useParams();
  const examId = params.examId as string;

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [summary, setSummary] = useState({ totalBatches: 0, pending: 0, queued: 0, active: 0, completed: 0, locked: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [serverTime, setServerTime] = useState(new Date());
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await api.get(`/admin/exams/${examId}/batches`);
      setExam(response.data.data.exam);
      setBatches(response.data.data.batches || []);
      setSummary(response.data.data.summary || { totalBatches: 0, pending: 0, queued: 0, active: 0, completed: 0, locked: 0 });
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [fetchBatches]);

  useEffect(() => {
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBatchAction = async () => {
    if (!selectedBatch || !actionType) return;

    setIsProcessing(true);
    try {
      let endpoint = '';
      let successMessage = '';

      switch (actionType) {
        case 'start':
          endpoint = `/admin/batches/${selectedBatch._id}/start`;
          successMessage = `Batch ${selectedBatch.batchNumber} started manually`;
          break;
        case 'complete':
          endpoint = `/admin/batches/${selectedBatch._id}/complete`;
          successMessage = `Batch ${selectedBatch.batchNumber} completed and locked`;
          break;
        default:
          throw new Error('Unknown action');
      }

      await api.post(endpoint);
      toast.success(successMessage);
      setShowActionModal(false);
      setSelectedBatch(null);
      setActionType('');
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${actionType} batch`);
    } finally {
      setIsProcessing(false);
    }
  };

  const openActionModal = (batch: Batch, action: string) => {
    setSelectedBatch(batch);
    setActionType(action);
    setShowActionModal(true);
  };

  const getStatusDisplay = (batch: Batch) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'PENDING', className: '' },
      queued: { label: 'QUEUED', className: 'lms-status-info' },
      active: { label: 'ACTIVE', className: 'lms-status-active' },
      completed: { label: 'COMPLETED', className: 'lms-status-success' },
      locked: { label: 'LOCKED', className: 'lms-status-closed' },
    };
    return statusMap[batch.status] || { label: batch.status.toUpperCase(), className: '' };
  };

  const getProgress = (batch: Batch) => {
    if (batch.totalEnrolled === 0) return 0;
    return Math.round((batch.totalSubmitted / batch.totalEnrolled) * 100);
  };

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Batch Controller" breadcrumbs={[{ label: 'Loading...' }]}>
        <div className="lms-loading">Loading batch data...</div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Batch Controller"
      breadcrumbs={[
        { label: 'Administration' },
        { label: 'Examinations', href: '/admin/exams' },
        { label: exam?.title || 'Exam' },
        { label: 'Batches' }
      ]}
    >
      {/* Server Time */}
      <div className="lms-info-box" style={{ marginBottom: '16px' }}>
        <div className="lms-info-box-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="lms-info-label">Server Time:</span>
              <span className="lms-info-value font-mono" style={{ marginLeft: '8px' }}>
                {format(serverTime, 'dd/MM/yyyy HH:mm:ss')}
              </span>
            </div>
            <div>
              <span className="lms-info-label">Exam Status:</span>
              <span className={`lms-status ${exam?.status === 'ongoing' ? 'lms-status-active' : ''}`} style={{ marginLeft: '8px' }}>
                {exam?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Batch Alert */}
      {summary.active > 0 && (
        <div className="lms-alert lms-alert-warning">
          <div className="lms-alert-title">⚠ BATCH IN PROGRESS</div>
          <div>{summary.active} batch(es) currently active. Students are taking the examination.</div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="lms-stats-row">
        <div className="lms-stat">
          <div className="lms-stat-value">{summary.totalBatches}</div>
          <div className="lms-stat-label">Total Batches</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{summary.pending}</div>
          <div className="lms-stat-label">Pending</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value" style={{ color: summary.active > 0 ? 'var(--success)' : undefined }}>
            {summary.active}
          </div>
          <div className="lms-stat-label">Active</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{summary.completed + summary.locked}</div>
          <div className="lms-stat-label">Completed</div>
        </div>
      </div>

      {/* Batch Lifecycle Info */}
      <div className="lms-info-box" style={{ marginBottom: '16px' }}>
        <div className="lms-info-box-header">Batch Lifecycle</div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="lms-status">PENDING</span><span>→</span>
            <span className="lms-status lms-status-info">QUEUED</span><span>→</span>
            <span className="lms-status lms-status-active">ACTIVE</span><span>→</span>
            <span className="lms-status lms-status-success">COMPLETED</span><span>→</span>
            <span className="lms-status lms-status-closed">LOCKED (PERMANENT)</span>
          </div>
          <div style={{ marginTop: '8px', color: 'var(--text-muted)' }}>
            Batches auto-advance based on scheduled times. Manual override available for Admin.
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="lms-section">
        <div className="lms-section-title">Batch Details</div>
        
        {batches.length === 0 ? (
          <div className="lms-table-empty">
            No batches configured for this examination.
            {exam?.status === 'draft' && (
              <span> Configure batches before publishing.</span>
            )}
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Roll Range</th>
                  <th>Enrolled</th>
                  <th>Logged In</th>
                  <th>Submitted</th>
                  <th>Violations</th>
                  <th>Scheduled Start</th>
                  <th>Scheduled End</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const statusDisplay = getStatusDisplay(batch);
                  const progress = getProgress(batch);
                  const isActive = batch.status === 'active';
                  const isPending = batch.status === 'pending' || batch.status === 'queued';
                  const isCompleted = batch.status === 'completed' || batch.status === 'locked';

                  return (
                    <tr key={batch._id} style={{
                      backgroundColor: isActive ? 'rgba(34, 197, 94, 0.05)' : undefined
                    }}>
                      <td><strong>Batch {batch.batchNumber}</strong></td>
                      <td className="font-mono" style={{ fontSize: '11px' }}>
                        {batch.rollNumberStart} - {batch.rollNumberEnd}
                      </td>
                      <td>{batch.totalEnrolled}</td>
                      <td>{batch.currentCount}</td>
                      <td>
                        {batch.totalSubmitted}
                        {batch.totalEnrolled > 0 && (
                          <span style={{ fontSize: '10px', color: '#666', marginLeft: '4px' }}>
                            ({progress}%)
                          </span>
                        )}
                      </td>
                      <td style={{ color: batch.totalViolations > 0 ? 'var(--error)' : undefined }}>
                        {batch.totalViolations}
                      </td>
                      <td className="font-mono" style={{ fontSize: '11px' }}>
                        {format(new Date(batch.scheduledStart), 'dd/MM HH:mm')}
                      </td>
                      <td className="font-mono" style={{ fontSize: '11px' }}>
                        {format(new Date(batch.scheduledEnd), 'dd/MM HH:mm')}
                      </td>
                      <td>
                        <span className={`lms-status ${statusDisplay.className}`}>
                          {statusDisplay.label}
                        </span>
                      </td>
                      <td style={{ width: '100px' }}>
                        <div style={{
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${progress}%`,
                            backgroundColor: progress === 100 ? '#22c55e' : '#3b82f6',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <Link href={`/admin/batches/${batch._id}`} className="lms-btn lms-btn-sm">
                            Details
                          </Link>
                          
                          {isPending && !batch.isLocked && (
                            <button
                              onClick={() => openActionModal(batch, 'start')}
                              className="lms-btn lms-btn-sm lms-btn-primary"
                            >
                              Start
                            </button>
                          )}
                          
                          {isActive && !batch.isLocked && (
                            <button
                              onClick={() => openActionModal(batch, 'complete')}
                              className="lms-btn lms-btn-sm lms-btn-danger"
                            >
                              Complete
                            </button>
                          )}
                          
                          {batch.isLocked && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '4px' }}>
                              🔒 Locked
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="lms-info-box">
        <div className="lms-info-box-header">Batch Controller Rules</div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>Maximum batch size: <strong>500 students</strong></li>
            <li>Batches <strong>auto-start</strong> when server time reaches scheduled start</li>
            <li>Batches <strong>auto-complete</strong> when scheduled end time is reached</li>
            <li>Active sessions are <strong>force-submitted</strong> on batch completion</li>
            <li>Locked batches are <strong>permanent</strong> and cannot be modified</li>
            <li>Teacher <strong>cannot</strong> skip, reopen, or edit batches</li>
          </ul>
        </div>
      </div>

      {/* Back Link */}
      <div style={{ marginTop: '24px' }}>
        <Link href={`/admin/exams/${examId}`} className="lms-btn">
          ← Back to Examination
        </Link>
      </div>

      {/* Action Modal */}
      {showActionModal && selectedBatch && (
        <div className="lms-modal-overlay">
          <div className="lms-modal">
            <div className="lms-modal-header">
              {actionType === 'start' ? 'Start Batch' : 'Complete Batch'}
            </div>
            <div className="lms-modal-body">
              <p>
                {actionType === 'start' 
                  ? `Are you sure you want to manually start Batch ${selectedBatch.batchNumber}?`
                  : `Are you sure you want to complete Batch ${selectedBatch.batchNumber}?`
                }
              </p>
              
              {actionType === 'complete' && (
                <div className="lms-alert lms-alert-warning" style={{ marginTop: '12px' }}>
                  <strong>⚠ Warning:</strong> All active sessions in this batch will be FORCE SUBMITTED.
                  This action cannot be undone.
                </div>
              )}
              
              {actionType === 'start' && (
                <div className="lms-alert lms-alert-info" style={{ marginTop: '12px' }}>
                  Students in this batch will be able to login immediately.
                </div>
              )}
            </div>
            <div className="lms-modal-footer">
              <button
                onClick={() => { setShowActionModal(false); setSelectedBatch(null); setActionType(''); }}
                className="lms-btn"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleBatchAction}
                className={`lms-btn ${actionType === 'complete' ? 'lms-btn-danger' : 'lms-btn-primary'}`}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : `Confirm ${actionType === 'start' ? 'Start' : 'Complete'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
