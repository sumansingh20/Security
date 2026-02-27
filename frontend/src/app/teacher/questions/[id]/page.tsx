'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import toast from 'react-hot-toast';

interface Question {
  _id: string;
  questionText: string;
  questionType: string;
  marks: number;
  difficulty: string;
  isActive: boolean;
  options?: { _id: string; text: string; isCorrect?: boolean }[];
  correctOptions?: string[];
  explanation?: string;
}

const TYPE_LABELS: Record<string, string> = {
  'mcq-single': 'MCQ (Single)',
  'mcq-multiple': 'MCQ (Multiple)',
  'true-false': 'True/False',
  'fill-blank': 'Fill in the Blank',
  'numerical': 'Numerical',
  'short-answer': 'Short Answer',
  'long-answer': 'Long Answer',
  'matching': 'Matching',
  'ordering': 'Ordering',
  'image-based': 'Image Based',
  'code': 'Code',
};

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

  if (loading) {
    return (
      <LMSLayout pageTitle="Question Detail" breadcrumbs={[{ label: 'Teacher' }, { label: 'Questions', href: '/teacher/questions' }, { label: 'Loading...' }]}>
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading question...</span>
        </div>
      </LMSLayout>
    );
  }

  if (error || !question) {
    return (
      <LMSLayout pageTitle="Question Detail" breadcrumbs={[{ label: 'Teacher' }, { label: 'Questions', href: '/teacher/questions' }, { label: 'Error' }]}>
        <div className="lms-alert lms-alert-error">{error || 'Question not found'}</div>
        <Link href="/teacher/questions" className="lms-btn" style={{ marginTop: '12px' }}>Back to Questions</Link>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Question Detail"
      breadcrumbs={[{ label: 'Teacher' }, { label: 'Questions', href: '/teacher/questions' }, { label: `Q: ${question.questionText.slice(0, 30)}...` }]}
    >
      {/* Question Info */}
      <div className="lms-section animate-fadeIn">
        <div className="lms-section-title">Question Information</div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span className="lms-badge lms-badge-info">{TYPE_LABELS[question.questionType] || question.questionType}</span>
            <span className="lms-badge" style={{ textTransform: 'capitalize' }}>{question.difficulty}</span>
            <span className="lms-badge lms-badge-success">{question.marks} marks</span>
            <span className={`lms-badge ${question.isActive ? 'lms-badge-success' : 'lms-badge-danger'}`}>
              {question.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div style={{ fontSize: '15px', lineHeight: '1.7', marginBottom: '16px' }}>
            {question.questionText}
          </div>

          {/* Options */}
          {question.options && question.options.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {question.options.map((opt, i) => {
                const isCorrect = opt.isCorrect || (question.correctOptions && opt._id ? question.correctOptions.includes(opt._id) : false);
                return (
                  <div
                    key={opt._id || i}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                      background: isCorrect ? 'rgba(34,197,94,0.08)' : 'transparent',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <span style={{ flex: 1 }}>{opt.text}</span>
                    {isCorrect && <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '12px' }}>Correct</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Explanation */}
          {question.explanation && (
            <div className="lms-alert lms-alert-info" style={{ marginTop: '16px' }}>
              <strong>Explanation:</strong> {question.explanation}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <Link href="/teacher/questions" className="lms-btn">Back to Questions</Link>
      </div>
    </LMSLayout>
  );
}
