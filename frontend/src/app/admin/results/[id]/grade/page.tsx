'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import toast from 'react-hot-toast';

interface Answer {
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
}

interface SubmissionDetail {
  _id: string;
  student: { firstName?: string; lastName?: string; name?: string; email: string };
  exam: { _id: string; title: string; totalMarks: number };
  answers: Answer[];
  score: number;
  status: string;
}

export default function GradeSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/admin/submissions/${resultId}`);
        const data = res.data.data?.submission || res.data.submission || res.data.data;
        setSubmission(data);
        // Initialize grades from existing marks
        const initialGrades: Record<string, number> = {};
        data.answers?.forEach((a: Answer) => {
          initialGrades[a.questionId || a.question?._id] = a.marksObtained || 0;
        });
        setGrades(initialGrades);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [resultId]);

  const handleGradeChange = (questionId: string, marks: number, maxMarks: number) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: Math.max(0, Math.min(marks, maxMarks)),
    }));
  };

  const handleSave = async () => {
    if (!submission) return;
    setSaving(true);
    try {
      const gradedAnswers = submission.answers.map((a) => ({
        questionId: a.questionId || a.question?._id,
        marks: grades[a.questionId || a.question?._id] || 0,
      }));
      await api.put(`/admin/submissions/${resultId}/grade`, { answers: gradedAnswers });
      toast.success('Grades saved successfully');
      router.push(`/admin/results/${resultId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const totalAwarded = Object.values(grades).reduce((sum, v) => sum + v, 0);

  if (loading) return <SidebarLayout><div className="p-8 text-center">Loading submission...</div></SidebarLayout>;
  if (error) return <SidebarLayout><div className="p-8 text-center text-red-600">{error}</div></SidebarLayout>;
  if (!submission) return <SidebarLayout><div className="p-8 text-center">Submission not found</div></SidebarLayout>;

  const studentName = submission.student?.name || `${submission.student?.firstName || ''} ${submission.student?.lastName || ''}`.trim() || submission.student?.email;

  return (
    <SidebarLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline text-sm">← Back</button>
        <h1 className="text-2xl font-bold mb-2">Grade Submission</h1>
        <p className="text-gray-600 mb-6">
          Student: <strong>{studentName}</strong> | Exam: <strong>{submission.exam?.title}</strong>
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex justify-between items-center">
          <span className="font-medium">Total: {totalAwarded} / {submission.exam?.totalMarks || '—'}</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Grades'}
          </button>
        </div>

        <div className="space-y-4">
          {submission.answers?.map((answer, idx) => {
            const qId = answer.questionId || answer.question?._id;
            const q = answer.question;
            return (
              <div key={qId || idx} className="bg-white rounded-lg shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium">Q{idx + 1}. {q?.questionText || 'Question text unavailable'}</h3>
                  <span className="text-sm text-gray-500 whitespace-nowrap ml-4">{q?.marks || 0} marks</span>
                </div>

                {q?.questionType === 'descriptive' && answer.textAnswer && (
                  <div className="bg-gray-50 border rounded p-3 mb-3">
                    <span className="text-xs text-gray-500">Student&apos;s Answer:</span>
                    <p className="mt-1">{answer.textAnswer}</p>
                  </div>
                )}

                {answer.selectedOptions && q?.options && (
                  <div className="mb-3 space-y-1">
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`text-sm p-2 rounded ${
                          answer.selectedOptions?.includes(oi)
                            ? opt.isCorrect
                              ? 'bg-green-50 border border-green-300'
                              : 'bg-red-50 border border-red-300'
                            : opt.isCorrect
                            ? 'bg-green-50 border border-green-200 opacity-60'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}. {opt.text}
                        {answer.selectedOptions?.includes(oi) && <span className="ml-2 text-xs">(selected)</span>}
                        {opt.isCorrect && <span className="ml-2 text-green-600 text-xs">✓ correct</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500">Marks:</label>
                  <input
                    type="number"
                    min={0}
                    max={q?.marks || 0}
                    step={0.5}
                    value={grades[qId] ?? 0}
                    onChange={(e) => handleGradeChange(qId, parseFloat(e.target.value) || 0, q?.marks || 0)}
                    className="w-20 border rounded px-2 py-1 text-sm"
                  />
                  <span className="text-sm text-gray-400">/ {q?.marks || 0}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 sticky bottom-4 bg-white border rounded-lg shadow-lg p-4 flex justify-between items-center">
          <span className="font-bold">Total: {totalAwarded} / {submission.exam?.totalMarks || '—'}</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Grades'}
          </button>
        </div>
      </div>
    </SidebarLayout>
  );
}
