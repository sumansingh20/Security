'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';

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
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save: ' + data.message);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      alert(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBatches = async () => {
    if (!formData.enableBatching) {
      alert('Please enable batching first');
      return;
    }
    
    if (selectedStudents.size === 0) {
      alert('Please select students first');
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
        alert(`Created ${data.totalBatches} batches successfully!`);
        setActiveTab('batches');
      } else {
        alert('Failed to create batches: ' + data.message);
      }
    } catch (error) {
      console.error('Create batches error:', error);
      alert('Failed to create batches');
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{exam?.title}</h1>
              <p className="text-sm text-gray-500">{exam?.subject}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/teacher/exams/${examId}/monitor`)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Live Monitor
              </button>
              <button
                onClick={() => router.push(`/teacher/exams/${examId}/results`)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View Results
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <nav className="flex space-x-8">
            {['settings', 'students', 'batches'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Exam Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Exam Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enableBatching}
                      onChange={(e) => handleFormChange('enableBatching', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Batch Mode (for 500+ students)</span>
                  </label>
                </div>
                
                {formData.enableBatching && (
                  <div className="ml-6 space-y-4 p-4 bg-blue-50 rounded">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Batch Size
                      </label>
                      <input
                        type="number"
                        value={formData.batchSize}
                        onChange={(e) => handleFormChange('batchSize', parseInt(e.target.value))}
                        min={10}
                        max={1000}
                        className="w-full p-2 border rounded"
                      />
                      <p className="text-xs text-gray-500 mt-1">Max students per batch (10-1000)</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buffer Time Between Batches (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.batchBufferMinutes}
                        onChange={(e) => handleFormChange('batchBufferMinutes', parseInt(e.target.value))}
                        min={5}
                        max={60}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.negativeMarking}
                      onChange={(e) => handleFormChange('negativeMarking', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Negative Marking</span>
                  </label>
                </div>
                
                {formData.negativeMarking && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Negative Mark Value (fraction of marks)
                    </label>
                    <select
                      value={formData.negativeMarkValue}
                      onChange={(e) => handleFormChange('negativeMarkValue', parseFloat(e.target.value))}
                      className="w-full p-2 border rounded"
                      title="Select negative mark value"
                    >
                      <option value={0.25}>1/4 (0.25)</option>
                      <option value={0.33}>1/3 (0.33)</option>
                      <option value={0.5}>1/2 (0.50)</option>
                      <option value={1}>Full mark (1.00)</option>
                    </select>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.calculatorEnabled}
                      onChange={(e) => handleFormChange('calculatorEnabled', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Calculator</span>
                  </label>
                </div>
                
                {formData.calculatorEnabled && (
                  <div className="ml-6">
                    <select
                      value={formData.calculatorType}
                      onChange={(e) => handleFormChange('calculatorType', e.target.value)}
                      className="w-full p-2 border rounded"
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
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Proctoring Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Violations Before Auto-Submit
                  </label>
                  <input
                    type="number"
                    value={formData.maxViolationsBeforeSubmit}
                    onChange={(e) => handleFormChange('maxViolationsBeforeSubmit', parseInt(e.target.value))}
                    min={1}
                    max={20}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.detectTabSwitch}
                      onChange={(e) => handleFormChange('detectTabSwitch', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Detect Tab/Window Switch</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.detectCopyPaste}
                      onChange={(e) => handleFormChange('detectCopyPaste', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Detect Copy/Paste Attempts</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.blockRightClick}
                      onChange={(e) => handleFormChange('blockRightClick', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Block Right-Click</span>
                  </label>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Session binding (IP + Device) is always enabled. 
                    Students cannot login from multiple devices.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="font-semibold text-gray-900">Enrolled Students</h2>
                <span className="text-sm text-gray-500">
                  {selectedStudents.size} of {students.length} selected
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
                </button>
                {formData.enableBatching && selectedStudents.size > 0 && (
                  <button
                    onClick={handleCreateBatches}
                    className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Create Batches ({batchPreview.length})
                  </button>
                )}
              </div>
            </div>
            
            {/* Batch Preview */}
            {formData.enableBatching && batchPreview.length > 0 && (
              <div className="p-4 bg-blue-50 border-b">
                <p className="text-sm font-medium text-blue-900 mb-2">Batch Preview:</p>
                <div className="flex flex-wrap gap-2">
                  {batchPreview.map((batch) => (
                    <span key={batch.batchNumber} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Batch {batch.batchNumber}: {batch.studentCount} students
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === students.length && students.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr 
                      key={student._id} 
                      className={`hover:bg-gray-50 ${selectedStudents.has(student._id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student._id)}
                          onChange={() => handleToggleStudent(student._id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {student.studentId || student.rollNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{student.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{student.department || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{student.semester || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Student Assignments'}
              </button>
            </div>
          </div>
        )}

        {/* Batches Tab */}
        {activeTab === 'batches' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Management</h2>
            <p className="text-gray-500 mb-4">
              Batches will be loaded from the Live Monitor page. Go to Live Monitor to manage batches during the exam.
            </p>
            <button
              onClick={() => router.push(`/teacher/exams/${examId}/monitor`)}
              className="px-6 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
            >
              Open Live Monitor
            </button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
