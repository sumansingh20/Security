'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

interface ResultDetail {
  _id: string;
  student: { firstName: string; lastName: string; studentId?: string; email: string };
  exam: { title: string; subject?: string; totalMarks: number; passingMarks: number; duration: number };
  status: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  questionsAttempted: number;
  totalQuestions: number;
  submittedAt: string;
  startedAt: string;
  totalViolations: number;
  submissionType: string;
}

export default function AdminResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await api.get(`/admin/submissions/${resultId}`);
        setResult(res.data.data?.submission || res.data.submission || res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load result');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId]);

  if (loading) return <div className="p-8 text-center">Loading result...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!result) return <div className="p-8 text-center">Result not found</div>;

  const passed = result.percentage >= ((result.exam?.passingMarks || 40) / (result.exam?.totalMarks || 100) * 100);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline text-sm">← Back</button>
      <h1 className="text-2xl font-bold mb-6">Submission Detail</h1>

      <div className={`p-4 rounded-lg mb-6 text-center ${passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="text-3xl font-bold">{result.marksObtained}/{result.totalMarks}</div>
        <div className="text-lg">{Math.round(result.percentage)}% — {passed ? 'PASSED' : 'FAILED'}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold text-lg mb-4">Student Info</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Name:</span> {result.student?.firstName} {result.student?.lastName}</p>
            <p><span className="text-gray-500">Email:</span> {result.student?.email}</p>
            {result.student?.studentId && <p><span className="text-gray-500">Student ID:</span> {result.student.studentId}</p>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold text-lg mb-4">Exam Info</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Exam:</span> {result.exam?.title}</p>
            <p><span className="text-gray-500">Subject:</span> {result.exam?.subject || '—'}</p>
            <p><span className="text-gray-500">Duration:</span> {result.exam?.duration} min</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold text-lg mb-4">Attempt Details</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Status:</span> <span className="capitalize">{result.status}</span></p>
            <p><span className="text-gray-500">Questions:</span> {result.questionsAttempted}/{result.totalQuestions}</p>
            <p><span className="text-gray-500">Violations:</span> {result.totalViolations}</p>
            <p><span className="text-gray-500">Type:</span> {
              result.submissionType === 'auto-timeout' ? 'Auto (time expired)' :
              result.submissionType === 'auto-violation' ? 'Auto (violations)' :
              result.submissionType === 'admin-force' ? 'Force submitted' :
              'Manual'
            }</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold text-lg mb-4">Timing</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Started:</span> {new Date(result.startedAt).toLocaleString()}</p>
            <p><span className="text-gray-500">Submitted:</span> {new Date(result.submittedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={() => router.push('/admin/results')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
          Back to Results
        </button>
      </div>
    </div>
  );
}
