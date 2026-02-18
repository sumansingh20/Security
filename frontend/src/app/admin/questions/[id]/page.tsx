'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

interface QuestionDetail {
  _id: string;
  questionText: string;
  questionType: string;
  marks: number;
  difficulty: string;
  options: { text: string; isCorrect: boolean }[];
  explanation?: string;
  correctAnswer?: string;
  isActive: boolean;
  category?: { name: string };
  tags?: string[];
}

export default function AdminQuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
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

  if (loading) return <div className="p-8 text-center">Loading question...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!question) return <div className="p-8 text-center">Question not found</div>;

  const typeLabels: Record<string, string> = {
    'mcq-single': 'Multiple Choice (Single)',
    'mcq-multiple': 'Multiple Choice (Multiple)',
    'true-false': 'True/False',
    'short-answer': 'Short Answer',
    'numerical': 'Numerical',
    'essay': 'Essay',
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline text-sm">← Back</button>
      <h1 className="text-2xl font-bold mb-6">Question Detail</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{typeLabels[question.questionType] || question.questionType}</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded capitalize">{question.difficulty}</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{question.marks} marks</span>
          <span className={`px-2 py-1 text-xs rounded ${question.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {question.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div>
          <h3 className="text-xs text-gray-500 uppercase mb-1">Question Text</h3>
          <p className="text-gray-900">{question.questionText}</p>
        </div>

        {question.options && question.options.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase mb-2">Options</h3>
            <div className="space-y-2">
              {question.options.map((opt, i) => (
                <div key={i} className={`p-3 rounded border ${opt.isCorrect ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="font-mono text-sm mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt.text}
                  {opt.isCorrect && <span className="ml-2 text-green-600 text-sm">✓ Correct</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {question.correctAnswer && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase mb-1">Correct Answer</h3>
            <p className="font-medium">{question.correctAnswer}</p>
          </div>
        )}

        {question.explanation && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase mb-1">Explanation</h3>
            <p className="text-gray-700">{question.explanation}</p>
          </div>
        )}

        {question.tags && question.tags.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase mb-1">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {question.tags.map((tag, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{tag}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <button onClick={() => router.push('/admin/questions')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
            Back to Questions
          </button>
        </div>
      </div>
    </div>
  );
}
