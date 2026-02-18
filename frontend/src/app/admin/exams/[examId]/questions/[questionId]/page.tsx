'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';

interface QuestionDetail {
  _id: string;
  questionText: string;
  questionType: string;
  marks: number;
  difficulty?: string;
  options?: { text: string; isCorrect: boolean }[];
  explanation?: string;
  correctAnswer?: string | number;
  isActive?: boolean;
  category?: { name: string } | string;
  tags?: string[];
  imageUrl?: string;
}

export default function ExamQuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const questionId = params.questionId as string;
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const res = await api.get(`/admin/questions/${questionId}`);
        setQuestion(res.data.data?.question || res.data.question || res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load question');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [questionId]);

  if (loading) return <SidebarLayout><div className="p-8 text-center">Loading question...</div></SidebarLayout>;
  if (error) return <SidebarLayout><div className="p-8 text-center text-red-600">{error}</div></SidebarLayout>;
  if (!question) return <SidebarLayout><div className="p-8 text-center">Question not found</div></SidebarLayout>;

  const typeLabels: Record<string, string> = {
    'mcq-single': 'Multiple Choice (Single)',
    'mcq-multiple': 'Multiple Choice (Multiple)',
    MCQ: 'Multiple Choice (Single)',
    MSQ: 'Multiple Choice (Multiple)',
    'true-false': 'True/False',
    numerical: 'Numerical',
    descriptive: 'Descriptive',
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/exams" className="hover:underline">Exams</Link>
          <span>/</span>
          <Link href={`/admin/exams/${examId}`} className="hover:underline">Exam</Link>
          <span>/</span>
          <span className="text-gray-700">Question</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Question Detail</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <span className="text-gray-500 text-sm">Question Text</span>
            <p className="mt-1 text-lg">{question.questionText}</p>
          </div>

          {question.imageUrl && (
            <div>
              <span className="text-gray-500 text-sm">Image</span>
              <img src={question.imageUrl} alt="Question" className="mt-1 max-w-md rounded border" />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-gray-500 text-sm">Type</span>
              <p className="font-medium">{typeLabels[question.questionType] || question.questionType}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Marks</span>
              <p className="font-medium">{question.marks}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Difficulty</span>
              <p className="font-medium capitalize">{question.difficulty || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Status</span>
              <p className="font-medium">{question.isActive !== false ? 'Active' : 'Inactive'}</p>
            </div>
          </div>

          {question.options && question.options.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Options</span>
              <div className="mt-2 space-y-2">
                {question.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded border ${opt.isCorrect ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt.text}
                    {opt.isCorrect && <span className="ml-2 text-green-600 text-sm font-medium">✓ Correct</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.correctAnswer !== undefined && (
            <div>
              <span className="text-gray-500 text-sm">Correct Answer</span>
              <p className="font-medium">{String(question.correctAnswer)}</p>
            </div>
          )}

          {question.explanation && (
            <div>
              <span className="text-gray-500 text-sm">Explanation</span>
              <p className="mt-1 text-gray-700">{question.explanation}</p>
            </div>
          )}

          {question.tags && question.tags.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Tags</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {question.tags.map((tag, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm">
            ← Back
          </button>
          <Link href={`/admin/exams/${examId}`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
            Back to Exam
          </Link>
        </div>
      </div>
    </SidebarLayout>
  );
}
