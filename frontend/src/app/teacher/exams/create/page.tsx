'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface ExamSettings {
  title: string;
  courseCode: string;
  subject: string;
  description: string;
  instructions: string;
  duration: number;
  startTime: string;
  endTime: string;
  batchSize: number;
  batchNumber: number;
  totalBatches: number;
  totalMarks: number;
  passingMarks: number;
  negativeMarking: boolean;
  negativeMarkValue: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  calculatorType: 'none' | 'basic' | 'scientific';
  requireFullscreen: boolean;
  detectTabSwitch: boolean;
  detectCopyPaste: boolean;
  maxViolations: number;
  blockRightClick: boolean;
}

const defaultSettings: ExamSettings = {
  title: '',
  courseCode: '',
  subject: '',
  description: '',
  instructions: 'Read all instructions carefully before starting.\nAll questions are compulsory.\nDo not navigate away from the exam window.\nAuto-submit will occur when time expires.',
  duration: 60,
  startTime: '',
  endTime: '',
  batchSize: 500,
  batchNumber: 1,
  totalBatches: 1,
  totalMarks: 100,
  passingMarks: 40,
  negativeMarking: false,
  negativeMarkValue: 0.25,
  shuffleQuestions: true,
  shuffleOptions: true,
  calculatorType: 'none',
  requireFullscreen: true,
  detectTabSwitch: true,
  detectCopyPaste: true,
  maxViolations: 5,
  blockRightClick: true,
};

export default function TeacherCreateExamPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [settings, setSettings] = useState<ExamSettings>(defaultSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverTime, setServerTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push('/my');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    // Fetch server time for accurate display
    const fetchServerTime = async () => {
      try {
        const res = await api.get('/teacher/server-time');
        setServerTime(new Date(res.data.data?.serverTime || Date.now()));
      } catch {
        setServerTime(new Date());
      }
    };
    fetchServerTime();
    const timer = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateSettings = <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!settings.title.trim()) {
      toast.error('Examination title is required');
      return;
    }
    if (!settings.subject) {
      toast.error('Subject is required');
      return;
    }
    if (!settings.startTime || !settings.endTime) {
      toast.error('Examination window (start and end time) is required');
      return;
    }
    if (new Date(settings.startTime) >= new Date(settings.endTime)) {
      toast.error('End time must be after start time');
      return;
    }
    if (settings.batchSize > 500) {
      toast.error('Batch size cannot exceed 500 students');
      return;
    }

    setIsSubmitting(true);
    try {
      // Map frontend fields to backend schema
      const examPayload = {
        title: settings.title,
        subject: settings.subject,
        description: settings.description,
        instructions: settings.instructions,
        duration: settings.duration,
        startTime: new Date(settings.startTime).toISOString(),
        endTime: new Date(settings.endTime).toISOString(),
        passingMarks: settings.passingMarks,
        randomizeQuestions: settings.shuffleQuestions,
        randomizeOptions: settings.shuffleOptions,
        calculatorType: settings.calculatorType,
        calculatorEnabled: settings.calculatorType !== 'none',
        enableProctoring: settings.requireFullscreen || settings.detectTabSwitch || settings.detectCopyPaste,
        detectTabSwitch: settings.detectTabSwitch,
        detectCopyPaste: settings.detectCopyPaste,
        blockRightClick: settings.blockRightClick,
        maxViolationsBeforeSubmit: settings.maxViolations,
        status,
      };
      
      const response = await api.post('/teacher/exams', examPayload);
      
      const examId = response.data.data?.exam?._id || response.data.data?._id;
      toast.success(`Examination ${status === 'draft' ? 'saved as draft' : 'created'}`);
      router.push(`/teacher/exams/${examId}/questions`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create examination');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'teacher')) {
    return null;
  }

  return (
    <LMSLayout
      pageTitle="Create New Examination"
      breadcrumbs={[
        { label: 'Teacher' },
        { label: 'Examinations', href: '/teacher/exams' },
        { label: 'Create New' }
      ]}
    >
      <div className="lms-alert lms-alert-info">
        <strong>Server Time:</strong> {formatDateTime(serverTime)} &nbsp;|&nbsp; 
        All examination timings are based on server time.
      </div>

      <div className="lms-tabs">
        <button 
          className={`lms-tab ${activeTab === 'general' ? 'lms-tab-active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General Settings
        </button>
        <button 
          className={`lms-tab ${activeTab === 'timing' ? 'lms-tab-active' : ''}`}
          onClick={() => setActiveTab('timing')}
        >
          Timing &amp; Window
        </button>
        <button 
          className={`lms-tab ${activeTab === 'batch' ? 'lms-tab-active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          Batch Settings
        </button>
        <button 
          className={`lms-tab ${activeTab === 'marks' ? 'lms-tab-active' : ''}`}
          onClick={() => setActiveTab('marks')}
        >
          Marks &amp; Grading
        </button>
        <button 
          className={`lms-tab ${activeTab === 'proctoring' ? 'lms-tab-active' : ''}`}
          onClick={() => setActiveTab('proctoring')}
        >
          Proctoring
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); }}>
        
        {activeTab === 'general' && (
          <div className="lms-form-section">
            <div className="lms-section-title">General Information</div>
            
            <div className="lms-form-group">
              <label className="lms-label">Examination Title <span className="lms-required">*</span></label>
              <input
                type="text"
                className="lms-input"
                value={settings.title}
                onChange={(e) => updateSettings('title', e.target.value)}
                placeholder="e.g., End Semester Examination - Mathematics 101"
                required
              />
            </div>

            <div className="lms-form-row">
              <div className="lms-form-group">
                <label className="lms-label">Course Code</label>
                <input
                  type="text"
                  className="lms-input"
                  value={settings.courseCode}
                  onChange={(e) => updateSettings('courseCode', e.target.value)}
                  placeholder="e.g., MATH101"
                />
              </div>
              <div className="lms-form-group">
                <label className="lms-label">Subject <span className="lms-required">*</span></label>
                <select
                  className="lms-select"
                  value={settings.subject}
                  onChange={(e) => updateSettings('subject', e.target.value)}
                  required
                  title="Select subject"
                >
                  <option value="">-- Select Subject --</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical Engineering</option>
                  <option value="Civil">Civil Engineering</option>
                  <option value="Electrical">Electrical Engineering</option>
                  <option value="English">English</option>
                  <option value="General Studies">General Studies</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="lms-form-group">
              <label className="lms-label">Description</label>
              <textarea
                className="lms-textarea"
                value={settings.description}
                onChange={(e) => updateSettings('description', e.target.value)}
                placeholder="Brief description of the examination..."
                rows={3}
              />
            </div>

            <div className="lms-form-group">
              <label className="lms-label">Instructions for Candidates</label>
              <textarea
                className="lms-textarea"
                value={settings.instructions}
                onChange={(e) => updateSettings('instructions', e.target.value)}
                rows={6}
              />
              <div className="lms-form-help">These instructions will be displayed before the examination starts.</div>
            </div>
          </div>
        )}

        {activeTab === 'timing' && (
          <div className="lms-form-section">
            <div className="lms-section-title">Examination Window</div>
            
            <div className="lms-alert lms-alert-warning">
              <strong>Important:</strong> Students can only access the examination within this time window.
              Late entry is not permitted. Examination will auto-submit when time expires.
            </div>

            <div className="lms-form-row">
              <div className="lms-form-group">
                <label className="lms-label">Start Date &amp; Time <span className="lms-required">*</span></label>
                <input
                  type="datetime-local"
                  className="lms-input"
                  value={settings.startTime}
                  onChange={(e) => updateSettings('startTime', e.target.value)}
                  required
                />
                <div className="lms-form-help">Examination opens at this time</div>
              </div>
              <div className="lms-form-group">
                <label className="lms-label">End Date &amp; Time <span className="lms-required">*</span></label>
                <input
                  type="datetime-local"
                  className="lms-input"
                  value={settings.endTime}
                  onChange={(e) => updateSettings('endTime', e.target.value)}
                  required
                />
                <div className="lms-form-help">Examination closes at this time</div>
              </div>
            </div>

            <div className="lms-form-group">
              <label className="lms-label">Duration (minutes) <span className="lms-required">*</span></label>
              <input
                type="number"
                className="lms-input w-40"
                value={settings.duration}
                onChange={(e) => updateSettings('duration', parseInt(e.target.value) || 60)}
                min={1}
                max={480}
                required
              />
              <div className="lms-form-help">Time allowed per candidate once started (max 8 hours)</div>
            </div>
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="lms-form-section">
            <div className="lms-section-title">Batch Configuration</div>
            
            <div className="lms-alert lms-alert-warning">
              <strong>Batch Limit:</strong> Maximum 500 students per batch. 
            </div>

            <div className="lms-form-row">
              <div className="lms-form-group">
                <label className="lms-label">Batch Size (max 500)</label>
                <input
                  type="number"
                  className="lms-input w-40"
                  value={settings.batchSize}
                  onChange={(e) => updateSettings('batchSize', Math.min(500, parseInt(e.target.value) || 500))}
                  min={1}
                  max={500}
                />
              </div>
              <div className="lms-form-group">
                <label className="lms-label">Batch Number</label>
                <input
                  type="number"
                  className="lms-input w-24"
                  value={settings.batchNumber}
                  onChange={(e) => updateSettings('batchNumber', parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
              <div className="lms-form-group">
                <label className="lms-label">Total Batches</label>
                <input
                  type="number"
                  className="lms-input w-24"
                  value={settings.totalBatches}
                  onChange={(e) => updateSettings('totalBatches', parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marks' && (
          <div className="lms-form-section">
            <div className="lms-section-title">Marks &amp; Grading</div>

            <div className="lms-form-row">
              <div className="lms-form-group">
                <label className="lms-label">Total Marks</label>
                <input
                  type="number"
                  className="lms-input w-32"
                  value={settings.totalMarks}
                  onChange={(e) => updateSettings('totalMarks', parseInt(e.target.value) || 100)}
                  min={1}
                />
              </div>
              <div className="lms-form-group">
                <label className="lms-label">Passing Marks</label>
                <input
                  type="number"
                  className="lms-input w-32"
                  value={settings.passingMarks}
                  onChange={(e) => updateSettings('passingMarks', parseInt(e.target.value) || 40)}
                  min={0}
                />
              </div>
            </div>

            <div className="lms-form-group">
              <label className="lms-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.negativeMarking}
                  onChange={(e) => updateSettings('negativeMarking', e.target.checked)}
                />
                Enable Negative Marking
              </label>
            </div>

            {settings.negativeMarking && (
              <div className="lms-form-group">
                <label className="lms-label">Negative Mark per Wrong Answer</label>
                <select
                  className="lms-select w-40"
                  value={settings.negativeMarkValue}
                  onChange={(e) => updateSettings('negativeMarkValue', parseFloat(e.target.value))}
                  title="Negative marking value"
                >
                  <option value="0.25">1/4 (0.25)</option>
                  <option value="0.33">1/3 (0.33)</option>
                  <option value="0.5">1/2 (0.50)</option>
                  <option value="1">Full (1.00)</option>
                </select>
              </div>
            )}

            <div className="lms-section-title mt-6">Question Behavior</div>

            <div className="lms-form-group">
              <label className="lms-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.shuffleQuestions}
                  onChange={(e) => updateSettings('shuffleQuestions', e.target.checked)}
                />
                Shuffle Questions
              </label>
            </div>

            <div className="lms-form-group">
              <label className="lms-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.shuffleOptions}
                  onChange={(e) => updateSettings('shuffleOptions', e.target.checked)}
                />
                Shuffle Answer Options
              </label>
            </div>

            <div className="lms-form-group">
              <label className="lms-label">Calculator</label>
              <select
                className="lms-select w-52"
                value={settings.calculatorType}
                onChange={(e) => updateSettings('calculatorType', e.target.value as any)}
                title="Calculator type"
              >
                <option value="none">Not Allowed</option>
                <option value="basic">Basic Calculator</option>
                <option value="scientific">Scientific Calculator</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'proctoring' && (
          <div className="lms-form-section">
            <div className="lms-section-title">Proctoring &amp; Anti-Cheating</div>
            
            <div className="lms-alert lms-alert-warning">
              <strong>Warning:</strong> Strict proctoring is enabled by default. 
            </div>

            <div className="lms-form-group">
              <label className="lms-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.requireFullscreen}
                  onChange={(e) => updateSettings('requireFullscreen', e.target.checked)}
                />
                Require Fullscreen Mode
              </label>
            </div>

            <div className="lms-form-group">
              <label className="lms-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.detectTabSwitch}
                  onChange={(e) => updateSettings('detectTabSwitch', e.target.checked)}
                />
                Detect Tab/Window Switch
              </label>
            </div>

            <div className="lms-form-group">
              <label className="lms-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.detectCopyPaste}
                  onChange={(e) => updateSettings('detectCopyPaste', e.target.checked)}
                />
                Block Copy/Paste
              </label>
            </div>

            <div className="lms-form-group">
              <label className="lms-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.blockRightClick}
                  onChange={(e) => updateSettings('blockRightClick', e.target.checked)}
                />
                Block Right-Click Menu
              </label>
            </div>

            <div className="lms-form-group">
              <label className="lms-label">Maximum Violations Before Auto-Submit</label>
              <input
                type="number"
                className="lms-input w-24"
                value={settings.maxViolations}
                onChange={(e) => updateSettings('maxViolations', parseInt(e.target.value) || 5)}
                min={1}
                max={20}
              />
            </div>
          </div>
        )}

        <div className="lms-form-actions">
          <button
            type="button"
            className="lms-btn"
            onClick={() => router.push('/teacher/exams')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="lms-btn"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            className="lms-btn lms-btn-primary"
            onClick={() => handleSubmit('published')}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create &amp; Add Questions'}
          </button>
        </div>
      </form>
    </LMSLayout>
  );
}
