'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Question {
  _id: string;
  questionText: string;
  questionType: string;
  marks: number;
  difficulty: string;
  isActive: boolean;
}

export default function TeacherQuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const res = await api.get(`/teacher/questions/${questionId}`);
        setQuestion(res.data.data?.question || res.data.question || res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load question');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [questionId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!question) return <div className="p-8 text-center">Question not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline text-sm">← Back</button>
      <h1 className="text-2xl font-bold mb-4">Question Detail</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{question.questionType}</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded capitalize">{question.difficulty}</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{question.marks} marks</span>
        </div>
        <p className="text-gray-900 mb-4">{question.questionText}</p>
        <button onClick={() => router.push('/teacher/questions')} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm">
          Back to Questions
        </button>
      </div>
    </div>
  );
}
