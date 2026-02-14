'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';

interface SubmissionDetail {
  _id: string;
  exam: { _id: string; title: string; subject?: string; totalMarks: number; passingMarks: number };
  student: { _id: string; name?: string; firstName?: string; lastName?: string; email: string; rollNumber?: string };
  answers: {
    questionId: string;
    question: {
      _id: string;
      questionText: string;
      questionType: string;
      marks: number;
      options?: { text: string; isCorrect: boolean }[];
      correctAnswer?: string | number;
      explanation?: string;
    };
    selectedOptions?: number[];
    textAnswer?: string;
    isCorrect?: boolean;
    marksObtained: number;
  }[];
  score: number;
  percentage: number;
  status: string;
  startTime: string;
  submitTime?: string;
  timeSpent: number;
  violations: { type: string; timestamp: string; details?: string }[];
  isPassed?: boolean;
  submissionType?: string;
}

export default function TeacherSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const submissionId = params.id as string;
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/teacher/submissions/${submissionId}`);
        setSubmission(res.data.data?.submission || res.data.submission || res.data.data);
      } catch (err: any) {
        // Fallback: try admin endpoint
        try {
          const res2 = await api.get(`/admin/submissions/${submissionId}`);
          setSubmission(res2.data.data?.submission || res2.data.submission || res2.data.data);
        } catch {
          setError(err.response?.data?.message || 'Failed to load submission');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [examId, submissionId]);

  if (loading) return <SidebarLayout><div className="p-8 text-center">Loading submission...</div></SidebarLayout>;
  if (error) return <SidebarLayout><div className="p-8 text-center text-red-600">{error}</div></SidebarLayout>;
  if (!submission) return <SidebarLayout><div className="p-8 text-center">Submission not found</div></SidebarLayout>;

  const studentName = submission.student?.name || `${submission.student?.firstName || ''} ${submission.student?.lastName || ''}`.trim() || submission.student?.email;
  const isPassed = submission.isPassed ?? (submission.percentage >= 40);

  return (
    <SidebarLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/teacher/exams" className="hover:underline">Exams</Link>
          <span>/</span>
          <Link href={`/teacher/exams/${examId}/results`} className="hover:underline">Results</Link>
          <span>/</span>
          <span className="text-gray-700">Submission</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Submission Detail</h1>

        {/* Score Card */}
        <div className={`p-4 rounded-lg mb-6 text-center ${isPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="text-3xl font-bold">{submission.score ?? 0} / {submission.exam?.totalMarks ?? 0}</div>
          <div className="text-lg">{Math.round(submission.percentage ?? 0)}% — {isPassed ? 'PASSED' : 'FAILED'}</div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-bold text-lg mb-3">Student</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Name:</span> {studentName}</p>
              <p><span className="text-gray-500">Email:</span> {submission.student?.email}</p>
              {submission.student?.rollNumber && <p><span className="text-gray-500">Roll No:</span> {submission.student.rollNumber}</p>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-bold text-lg mb-3">Submission Info</h2>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Status:</span> <span className="capitalize">{submission.status}</span></p>
              {submission.submissionType && <p><span className="text-gray-500">Type:</span> {submission.submissionType}</p>}
              <p><span className="text-gray-500">Time Spent:</span> {Math.round((submission.timeSpent || 0) / 60)} min</p>
              {submission.submitTime && <p><span className="text-gray-500">Submitted:</span> {new Date(submission.submitTime).toLocaleString()}</p>}
            </div>
          </div>
        </div>

        {/* Violations */}
        {submission.violations && submission.violations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="font-bold text-lg mb-3 text-red-600">Violations ({submission.violations.length})</h2>
            <div className="space-y-2">
              {submission.violations.map((v, i) => (
                <div key={i} className="flex items-center gap-3 text-sm bg-red-50 p-2 rounded">
                  <span className="text-red-500 font-medium">{v.type}</span>
                  <span className="text-gray-500">{new Date(v.timestamp).toLocaleString()}</span>
                  {v.details && <span className="text-gray-600">{v.details}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Answers */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">Answers ({submission.answers?.length || 0})</h2>
          </div>
          <div className="divide-y">
            {submission.answers?.map((answer, idx) => {
              const q = answer.question;
              return (
                <div key={answer.questionId || idx} className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">Q{idx + 1}. {q?.questionText || 'Question text unavailable'}</h3>
                    <span className={`text-sm font-medium ${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {answer.marksObtained} / {q?.marks || 0}
                    </span>
                  </div>

                  {answer.selectedOptions && q?.options && (
                    <div className="space-y-1 mb-2">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`text-sm p-2 rounded ${
                            answer.selectedOptions?.includes(oi)
                              ? opt.isCorrect ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'
                              : opt.isCorrect ? 'bg-green-50 border border-green-200 opacity-60' : ''
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt.text}
                          {answer.selectedOptions?.includes(oi) && <span className="ml-1 text-xs">(selected)</span>}
                          {opt.isCorrect && <span className="ml-1 text-green-600 text-xs">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {answer.textAnswer && (
                    <div className="bg-gray-50 border rounded p-2 text-sm mb-2">
                      <span className="text-xs text-gray-500">Answer: </span>{answer.textAnswer}
                    </div>
                  )}

                  {q?.explanation && (
                    <div className="text-sm text-gray-600 italic">Explanation: {q.explanation}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm">← Back to Results</button>
        </div>
      </div>
    </SidebarLayout>
  );
}
