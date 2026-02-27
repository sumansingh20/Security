'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import toast from 'react-hot-toast';

interface Exam {
  id: string;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  duration: number;
  startTime: string;
  endTime: string;
  status: string;
  totalMarks: number;
  passingMarks: number;
  enableBatching: boolean;
  batchSize: number;
  negativeMarking: boolean;
  negativeMarkValue: number;
  questionsCount: number;
  enrolledCount: number;
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  rollNumber: string;
  department: string;
  semester: number;
}

export default function ExamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'students' | 'batches'>('settings');
  const [batchPreview, setBatchPreview] = useState<{ batchNumber: number; studentCount: number }[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    enableBatching: false,
    batchSize: 500,
    batchBufferMinutes: 15,
    negativeMarking: false,
    negativeMarkValue: 0.25,
    maxViolationsBeforeSubmit: 5,
    detectTabSwitch: true,
    detectCopyPaste: true,
    blockRightClick: true,
    calculatorEnabled: false,
    calculatorType: 'none',
  });

  useEffect(() => {
    fetchExam();
    fetchStudents();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const response = await api.get(`/teacher/exams/${examId}`);
      const data = response.data;
      if (data.success) {
        const examData = data.data?.exam || data.exam;
        setExam(examData);
        setFormData({
          enableBatching: examData.enableBatching || false,
          batchSize: examData.batchSize || 500,
          batchBufferMinutes: examData.batchBufferMinutes || 15,
          negativeMarking: examData.negativeMarking || false,
          negativeMarkValue: examData.negativeMarkValue || 0.25,
          maxViolationsBeforeSubmit: examData.maxViolationsBeforeSubmit || 5,
          detectTabSwitch: examData.detectTabSwitch !== false,
          detectCopyPaste: examData.detectCopyPaste !== false,
          blockRightClick: examData.blockRightClick !== false,
          calculatorEnabled: examData.calculatorEnabled || false,
          calculatorType: examData.calculatorType || 'none',
        });
        if (examData.enrolledStudents) {
          setSelectedStudents(new Set(examData.enrolledStudents));
        }
      }
    } catch (error) {
      console.error('Fetch exam error:', error);
      toast.error('Failed to load exam settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/teacher/users?role=student&limit=1000');
      const data = response.data;
      if (data.success) {
        setStudents(data.data?.users || data.users || []);
      }
    } catch (error) {
      console.error('Fetch students error:', error);
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'batchSize' || field === 'enableBatching') {
      updateBatchPreview(
        field === 'batchSize' ? value : formData.batchSize,
        field === 'enableBatching' ? value : formData.enableBatching
      );
    }
  };

  const updateBatchPreview = (batchSize: number, enableBatching: boolean) => {
    if (!enableBatching) {
      setBatchPreview([]);
      return;
    }

    const totalStudents = selectedStudents.size;
    const batches = [];
    let remaining = totalStudents;
    let batchNumber = 1;

    while (remaining > 0) {
      const count = Math.min(remaining, batchSize);
      batches.push({ batchNumber, studentCount: count });
      remaining -= count;
      batchNumber++;
    }

    setBatchPreview(batches);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s._id)));
    }
    updateBatchPreview(formData.batchSize, formData.enableBatching);
  };

  const handleToggleStudent = (studentId: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudents(newSet);
    updateBatchPreview(formData.batchSize, formData.enableBatching);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/teacher/exams/${examId}`, {
        ...formData,
        enrolledStudents: Array.from(selectedStudents),
      });

      const data = response.data;
      if (data.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error('Failed to save: ' + data.message);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBatches = async () => {
    if (!formData.enableBatching) {
      toast.error('Please enable batching first');
      return;
    }

    if (selectedStudents.size === 0) {
      toast.error('Please select students first');
      return;
    }

    if (!confirm(`Create ${batchPreview.length} batches for ${selectedStudents.size} students?`)) {
      return;
    }

    try {
      const response = await api.post(`/exam-engine/${examId}/batches`, {
        batchSize: formData.batchSize,
        studentList: Array.from(selectedStudents),
      });

      const data = response.data;
      if (data.success) {
        toast.success(`Created ${data.totalBatches} batches successfully!`);
        setActiveTab('batches');
      } else {
        toast.error('Failed to create batches: ' + data.message);
      }
    } catch (error) {
      console.error('Create batches error:', error);
      toast.error('Failed to create batches');
    }
  };

  if (loading) {
    return (
      <LMSLayout pageTitle="Exam Settings">
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading exam settings...</span>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle={exam?.title || 'Exam Settings'}
      breadcrumbs={[
        { label: 'Teacher' },
        { label: 'Examinations', href: '/teacher/exams' },
        { label: exam?.title || 'Exam', href: `/teacher/exams/${examId}` },
        { label: 'Settings' },
      ]}
    >
      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Link href={`/teacher/exams/${examId}`} className="lms-btn">Back to Exam</Link>
        <Link href={`/teacher/exams/${examId}/monitor`} className="lms-btn lms-btn-primary">Live Monitor</Link>
        <Link href={`/teacher/exams/${examId}/results`} className="lms-btn">View Results</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {(['settings', 'students', 'batches'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`lms-btn ${activeTab === tab ? 'lms-btn-primary' : ''}`}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Exam Settings */}
          <div className="lms-section animate-fadeIn">
            <div className="lms-section-title">Exam Settings</div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="lms-form-group" style={{ margin: 0 }}>
                <label className="lms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.enableBatching}
                    onChange={(e) => handleFormChange('enableBatching', e.target.checked)}
                  />
                  Enable Batch Mode (for 500+ students)
                </label>
              </div>

              {formData.enableBatching && (
                <div className="lms-info-box" style={{ margin: 0 }}>
                  <div className="lms-info-box-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Batch Size</label>
                      <input
                        type="number"
                        className="lms-input"
                        value={formData.batchSize}
                        onChange={(e) => handleFormChange('batchSize', parseInt(e.target.value))}
                        min={10}
                        max={1000}
                      />
                      <div className="lms-form-help">Max students per batch (10-1000)</div>
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Buffer Time Between Batches (minutes)</label>
                      <input
                        type="number"
                        className="lms-input"
                        value={formData.batchBufferMinutes}
                        onChange={(e) => handleFormChange('batchBufferMinutes', parseInt(e.target.value))}
                        min={5}
                        max={60}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="lms-form-group" style={{ margin: 0 }}>
                <label className="lms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.negativeMarking}
                    onChange={(e) => handleFormChange('negativeMarking', e.target.checked)}
                  />
                  Enable Negative Marking
                </label>
              </div>

              {formData.negativeMarking && (
                <div className="lms-form-group" style={{ margin: 0, paddingLeft: '24px' }}>
                  <label className="lms-label">Negative Mark Value</label>
                  <select
                    className="lms-select"
                    value={formData.negativeMarkValue}
                    onChange={(e) => handleFormChange('negativeMarkValue', parseFloat(e.target.value))}
                    title="Select negative mark value"
                  >
                    <option value={0.25}>1/4 (0.25)</option>
                    <option value={0.33}>1/3 (0.33)</option>
                    <option value={0.5}>1/2 (0.50)</option>
                    <option value={1}>Full mark (1.00)</option>
                  </select>
                </div>
              )}

              <div className="lms-form-group" style={{ margin: 0 }}>
                <label className="lms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.calculatorEnabled}
                    onChange={(e) => handleFormChange('calculatorEnabled', e.target.checked)}
                  />
                  Enable Calculator
                </label>
              </div>

              {formData.calculatorEnabled && (
                <div className="lms-form-group" style={{ margin: 0, paddingLeft: '24px' }}>
                  <select
                    className="lms-select"
                    value={formData.calculatorType}
                    onChange={(e) => handleFormChange('calculatorType', e.target.value)}
                    title="Select calculator type"
                  >
                    <option value="basic">Basic Calculator</option>
                    <option value="scientific">Scientific Calculator</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Proctoring Settings */}
          <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="lms-section-title">Proctoring Settings</div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="lms-form-group" style={{ margin: 0 }}>
                <label className="lms-label">Max Violations Before Auto-Submit</label>
                <input
                  type="number"
                  className="lms-input"
                  style={{ width: '120px' }}
                  value={formData.maxViolationsBeforeSubmit}
                  onChange={(e) => handleFormChange('maxViolationsBeforeSubmit', parseInt(e.target.value))}
                  min={1}
                  max={20}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="lms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.detectTabSwitch}
                    onChange={(e) => handleFormChange('detectTabSwitch', e.target.checked)}
                  />
                  Detect Tab/Window Switch
                </label>

                <label className="lms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.detectCopyPaste}
                    onChange={(e) => handleFormChange('detectCopyPaste', e.target.checked)}
                  />
                  Detect Copy/Paste Attempts
                </label>

                <label className="lms-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.blockRightClick}
                    onChange={(e) => handleFormChange('blockRightClick', e.target.checked)}
                  />
                  Block Right-Click
                </label>
              </div>

              <div className="lms-alert lms-alert-warning" style={{ margin: 0 }}>
                <strong>Note:</strong> Session binding (IP + Device) is always enabled.
                Students cannot login from multiple devices.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="lms-btn lms-btn-primary"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="lms-section animate-fadeIn">
          <div className="lms-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Enrolled Students ({selectedStudents.size} of {students.length} selected)</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={handleSelectAll} className="lms-btn lms-btn-sm">
                {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
              </button>
              {formData.enableBatching && selectedStudents.size > 0 && (
                <button onClick={handleCreateBatches} className="lms-btn lms-btn-sm lms-btn-success">
                  Create Batches ({batchPreview.length})
                </button>
              )}
            </div>
          </div>

          {/* Batch Preview */}
          {formData.enableBatching && batchPreview.length > 0 && (
            <div className="lms-alert lms-alert-info" style={{ margin: '0 0 12px' }}>
              <strong>Batch Preview:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {batchPreview.map((batch) => (
                  <span key={batch.batchNumber} className="lms-badge">
                    Batch {batch.batchNumber}: {batch.studentCount} students
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="lms-table-container" style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table className="lms-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === students.length && students.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Semester</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student._id}
                    style={selectedStudents.has(student._id) ? { background: 'rgba(59, 130, 246, 0.05)' } : {}}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student._id)}
                        onChange={() => handleToggleStudent(student._id)}
                      />
                    </td>
                    <td className="font-mono">{student.studentId || student.rollNumber || '-'}</td>
                    <td><strong>{student.firstName} {student.lastName}</strong></td>
                    <td style={{ fontSize: '12px' }}>{student.email}</td>
                    <td>{student.department || '-'}</td>
                    <td>{student.semester || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px' }}>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="lms-btn lms-btn-primary"
            >
              {saving ? 'Saving...' : 'Save Student Assignments'}
            </button>
          </div>
        </div>
      )}

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <div className="lms-section animate-fadeIn">
          <div className="lms-section-title">Batch Management</div>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
              Batches will be loaded from the Live Monitor page. Go to Live Monitor to manage batches during the exam.
            </p>
            <Link href={`/teacher/exams/${examId}/monitor`} className="lms-btn lms-btn-primary">
              Open Live Monitor
            </Link>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
