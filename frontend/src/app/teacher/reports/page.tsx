'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ExamResult {
  _id: string;
  exam: {
    _id: string;
    title: string;
    subject: string;
    totalMarks: number;
  };
  submissionCount: number;
  averageScore: number;
  passRate: number;
  completedAt?: string;
}

interface ExamExportOption {
  _id: string;
  title: string;
  status: string;
}

export default function TeacherReportsPage() {
  const { user, hasHydrated } = useAuthStore();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [examsForExport, setExamsForExport] = useState<ExamExportOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch all exams to generate report data
      const examsRes = await api.get('/teacher/exams?limit=200');
      const rawData = examsRes.data.data;
      const exams = Array.isArray(rawData) ? rawData : (rawData?.exams || []);
      
      // Process exams for results display
      const completedExams = exams.filter((e: any) => 
        e.status === 'completed' || e.status === 'archived'
      );
      
      // Fetch real analytics for each completed exam (in parallel, max 5)
      const results: ExamResult[] = [];
      for (let i = 0; i < completedExams.length; i += 5) {
        const batch = completedExams.slice(i, i + 5);
        const analyticsResults = await Promise.allSettled(
          batch.map((exam: any) => api.get(`/teacher/exams/${exam._id}/analytics`))
        );
        
        batch.forEach((exam: any, idx: number) => {
          const analyticsResult = analyticsResults[idx];
          const stats = analyticsResult.status === 'fulfilled' 
            ? analyticsResult.value.data.data?.stats 
            : null;
          
          results.push({
            _id: exam._id,
            exam: {
              _id: exam._id,
              title: exam.title,
              subject: exam.subject || exam.courseCode || 'General',
              totalMarks: exam.totalMarks || 100
            },
            submissionCount: stats?.totalSubmissions ?? (typeof exam.submissionsCount === 'number' ? exam.submissionsCount : 0),
            averageScore: stats?.averageScore ?? 0,
            passRate: stats?.passRate ?? 0,
            completedAt: exam.endTime
          });
        });
      }

      setExamResults(results);
      setExamsForExport(exams.filter((e: any) => 
        e.status !== 'draft'
      ).map((e: any) => ({
        _id: e._id,
        title: e.title,
        status: e.status
      })));
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated && user) {
      fetchData();
    }
  }, [hasHydrated, user, fetchData]);

  const handleExportCSV = async (examId: string) => {
    if (!examId) {
      toast.error('Please select an examination');
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await api.get(`/teacher/exams/${examId}/results/export`, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_results_${examId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Results exported successfully');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.response?.data?.message || 'Failed to export results');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate summary stats
  const totalSubmissions = examResults.reduce((sum, r) => sum + r.submissionCount, 0);
  const overallAvg = examResults.length > 0
    ? examResults.reduce((sum, r) => sum + (r.averageScore || 0), 0) / examResults.length
    : 0;
  const overallPassRate = examResults.length > 0
    ? examResults.reduce((sum, r) => sum + (r.passRate || 0), 0) / examResults.length
    : 0;

  return (
    <LMSLayout
      pageTitle="Examination Reports & Analytics"
      breadcrumbs={[
        { label: 'Teacher' },
        { label: 'Reports' }
      ]}
    >
      {/* Summary Statistics */}
      <div className="lms-stats-row">
        <div className="lms-stat">
          <div className="lms-stat-value">{examResults.length}</div>
          <div className="lms-stat-label">Completed Exams</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{totalSubmissions}</div>
          <div className="lms-stat-label">Total Submissions</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value text-blue-700">{overallAvg.toFixed(1)}%</div>
          <div className="lms-stat-label">Average Score</div>
        </div>
        <div className="lms-stat">
          <div className={`lms-stat-value ${overallPassRate >= 60 ? 'text-green-700' : 'text-red-700'}`}>
            {overallPassRate.toFixed(1)}%
          </div>
          <div className="lms-stat-label">Pass Rate</div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="lms-alert lms-alert-error mb-4">
          {error}
          <button onClick={fetchData} className="ml-4 underline">Retry</button>
        </div>
      )}

      {/* Exam Results Table */}
      <div className="lms-section">
        <div className="lms-section-title">Examination Results Summary</div>
        
        {isLoading ? (
          <div className="lms-loading">Loading examination data...</div>
        ) : examResults.length === 0 ? (
          <div className="lms-table-empty">
            No completed examinations found. Results will appear here once exams are completed.
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Exam Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Submissions</th>
                  <th>Avg Score</th>
                  <th>Pass Rate</th>
                  <th>Completed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {examResults.map((result) => (
                  <tr key={result._id}>
                    <td className="font-mono text-xs">{result._id.slice(-8).toUpperCase()}</td>
                    <td>{result.exam.title}</td>
                    <td>{result.exam.subject}</td>
                    <td className="text-center">{result.submissionCount}</td>
                    <td className="text-center">
                      <span className={`font-medium ${
                        result.averageScore >= 70 ? 'text-green-700' :
                        result.averageScore >= 50 ? 'text-yellow-700' : 'text-red-700'
                      }`}>
                        {result.averageScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`font-medium ${
                        result.passRate >= 70 ? 'text-green-700' :
                        result.passRate >= 50 ? 'text-yellow-700' : 'text-red-700'
                      }`}>
                        {result.passRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center font-mono text-xs">
                      {result.completedAt ? format(new Date(result.completedAt), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Link
                          href={`/teacher/exams/${result._id}?tab=results`}
                          className="lms-btn lms-btn-sm"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleExportCSV(result._id)}
                          className="lms-btn lms-btn-sm"
                          disabled={isExporting}
                        >
                          Export
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Types */}
      <div className="lms-section">
        <div className="lms-section-title">Available Reports</div>
        <div className="lms-info-box">
          <div className="lms-info-box-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 p-4 bg-white">
                <div className="font-medium text-gray-800 mb-1">Exam Performance Report</div>
                <div className="text-sm text-gray-600 mb-3">
                  Detailed analysis of student performance, score distribution, and question-level statistics.
                </div>
                <Link href="/teacher/exams" className="lms-btn lms-btn-sm">
                  View Exams →
                </Link>
              </div>
              
              <div className="border border-gray-200 p-4 bg-white">
                <div className="font-medium text-gray-800 mb-1">Violation Report</div>
                <div className="text-sm text-gray-600 mb-3">
                  Review all proctoring violations, suspicious activities, and integrity alerts.
                </div>
                <Link href="/teacher/exams?tab=violations" className="lms-btn lms-btn-sm">
                  View Violations →
                </Link>
              </div>
              
              <div className="border border-gray-200 p-4 bg-white">
                <div className="font-medium text-gray-800 mb-1">Question Analysis</div>
                <div className="text-sm text-gray-600 mb-3">
                  Analyze question difficulty, discrimination index, and common wrong answers.
                </div>
                <Link href="/teacher/questions" className="lms-btn lms-btn-sm">
                  Question Bank →
                </Link>
              </div>
              
              <div className="border border-gray-200 p-4 bg-white">
                <div className="font-medium text-gray-800 mb-1">Batch Analysis</div>
                <div className="text-sm text-gray-600 mb-3">
                  Compare performance across different exam batches and time slots.
                </div>
                <Link href="/teacher/exams" className="lms-btn lms-btn-sm">
                  View Batches →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="lms-section">
        <div className="lms-section-title">Export Results</div>
        <div className="lms-info-box">
          <div className="lms-info-box-body">
            <div className="flex flex-wrap items-end gap-4">
              <div className="lms-form-group" style={{ margin: 0 }}>
                <label className="lms-label">Select Examination</label>
                <select
                  className="lms-select"
                  title="Select examination"
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  style={{ minWidth: '250px' }}
                >
                  <option value="">-- Select an exam --</option>
                  {examsForExport.map((exam) => (
                    <option key={exam._id} value={exam._id}>
                      {exam.title} ({exam.status})
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => handleExportCSV(selectedExam)}
                className="lms-btn lms-btn-primary"
                disabled={!selectedExam || isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export to CSV'}
              </button>
            </div>
            
            <div className="mt-4 text-xs text-gray-600">
              <strong>Note:</strong> Exported CSV includes student details, scores, time taken, violation count, and submission status.
            </div>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="lms-info-box">
        <div className="lms-info-box-header">Report Guidelines</div>
        <div className="lms-info-box-body text-xs">
          <ul className="list-disc pl-5 m-0">
            <li>Reports are generated from completed and archived examinations only</li>
            <li>Average scores and pass rates are calculated based on actual submissions</li>
            <li>Export feature generates CSV files compatible with Excel and other spreadsheet software</li>
            <li>For detailed student-level analysis, click View on individual exams</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
