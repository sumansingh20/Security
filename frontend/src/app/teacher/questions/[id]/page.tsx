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
  negativeMarks?: number;
  difficulty: string;
  isActive: boolean;
  options?: { _id: string; text: string; isCorrect?: boolean }[];
  correctOptions?: string[];
  correctAnswer?: string | number;
  explanation?: string;
  matchPairs?: { left: string; right: string }[];
  correctOrder?: string[];
  imageUrl?: string;
  codeLanguage?: string;
  answerTolerance?: number;
  tags?: string[];
  exam?: { _id: string; title: string; status: string };
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

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: '#dcfce7', text: '#16a34a' },
  medium: { bg: '#fff7ed', text: '#ea580c' },
  hard: { bg: '#fef2f2', text: '#dc2626' },
};

export default function TeacherQuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!question) return;
    const plainText = question.questionText.replace(/<[^>]*>/g, '').substring(0, 50);
    if (!confirm(`Delete question: "${plainText}..."?\nThis action cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/teacher/questions/${questionId}`);
      toast.success('Question deleted successfully');
      router.push('/teacher/questions');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete question');
      setDeleting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!question) return;
    try {
      await api.put(`/teacher/questions/${questionId}`, { isActive: !question.isActive });
      toast.success(`Question ${!question.isActive ? 'activated' : 'deactivated'}`);
      setQuestion({ ...question, isActive: !question.isActive });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update question');
    }
  };

  if (loading) {
    return (
      <LMSLayout pageTitle="Question Detail" breadcrumbs={[{ label: 'Dashboard', href: '/teacher' }, { label: 'Questions', href: '/teacher/questions' }, { label: 'Loading...' }]}>
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading question...</div>
      </LMSLayout>
    );
  }

  if (error || !question) {
    return (
      <LMSLayout pageTitle="Question Detail" breadcrumbs={[{ label: 'Dashboard', href: '/teacher' }, { label: 'Questions', href: '/teacher/questions' }, { label: 'Error' }]}>
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, marginBottom: 16 }}>{error || 'Question not found'}</div>
        <Link href="/teacher/questions" className="lms-btn lms-btn-secondary" style={{ textDecoration: 'none' }}>Back to Questions</Link>
      </LMSLayout>
    );
  }

  const diff = DIFF_COLORS[question.difficulty] || DIFF_COLORS.medium;
  const examStatus = question.exam?.status || 'draft';
  const canModify = ['draft', 'published'].includes(examStatus);

  return (
    <LMSLayout
      pageTitle="Question Detail"
      breadcrumbs={[{ label: 'Dashboard', href: '/teacher' }, { label: 'Questions', href: '/teacher/questions' }, { label: `Q: ${question.questionText.slice(0, 30)}...` }]}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Meta Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600, background: 'var(--primary-light, #e8f0fe)', color: 'var(--primary)' }}>
            {TYPE_LABELS[question.questionType] || question.questionType}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600, background: diff.bg, color: diff.text, textTransform: 'capitalize' }}>
            {question.difficulty}
          </span>
          <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600, background: '#f0f9ff', color: '#0369a1' }}>
            {question.marks} mark{question.marks !== 1 ? 's' : ''}
          </span>
          {question.negativeMarks ? (
            <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600, background: '#fef2f2', color: '#dc2626' }}>
              -{question.negativeMarks} negative
            </span>
          ) : null}
          <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600, background: question.isActive ? '#dcfce7' : '#fef2f2', color: question.isActive ? '#16a34a' : '#dc2626' }}>
            {question.isActive ? 'Active' : 'Inactive'}
          </span>
          {question.exam && (
            <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600, background: canModify ? '#eff6ff' : '#fff7ed', color: canModify ? '#1d4ed8' : '#ea580c' }}>
              Exam: {question.exam.title} ({examStatus})
            </span>
          )}
        </div>

        {/* Question Text */}
        <div className="lms-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Text</h3>
          </div>
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{question.questionText}</p>
          </div>
        </div>

        {/* Question Image */}
        {question.imageUrl && (
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Image</h3>
            </div>
            <div style={{ padding: 16, textAlign: 'center' }}>
              <img src={question.imageUrl} alt="Question" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, border: '1px solid var(--border)' }} />
            </div>
          </div>
        )}

        {/* Options */}
        {question.options && question.options.length > 0 && (
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Options</h3>
            </div>
            <div style={{ padding: 16 }}>
              {question.options.map((opt, i) => {
                const isCorrect = opt.isCorrect || (question.correctOptions && opt._id ? question.correctOptions.includes(opt._id) : false);
                return (
                  <div key={opt._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 8, borderRadius: 8, border: `1px solid ${isCorrect ? '#22c55e' : 'var(--border)'}`, background: isCorrect ? '#f0fdf4' : 'transparent' }}>
                    <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isCorrect ? '#22c55e' : 'var(--bg-secondary)', color: isCorrect ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ flex: 1, fontSize: 14 }}>{opt.text}</span>
                    {isCorrect && <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>Correct</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Correct Answer */}
        {question.correctAnswer !== undefined && question.correctAnswer !== null && (
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>
                {question.questionType === 'code' ? 'Expected Solution' : question.questionType === 'long-answer' ? 'Model Answer' : 'Correct Answer'}
              </h3>
            </div>
            <div style={{ padding: 16 }}>
              {question.questionType === 'numerical' && question.answerTolerance ? (
                <p style={{ fontSize: 15, fontWeight: 600 }}>{String(question.correctAnswer)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>( ± {question.answerTolerance} tolerance)</span></p>
              ) : question.questionType === 'code' ? (
                <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 16, borderRadius: 8, fontSize: 13, fontFamily: 'monospace', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  {question.codeLanguage && <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Language: {question.codeLanguage}</div>}
                  {String(question.correctAnswer)}
                </pre>
              ) : (
                <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{String(question.correctAnswer)}</p>
              )}
            </div>
          </div>
        )}

        {/* Match Pairs */}
        {question.matchPairs && question.matchPairs.length > 0 && (
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Match Pairs</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Premise</span>
                <span></span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Response</span>
              </div>
              {question.matchPairs.map((pair, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <div style={{ padding: '8px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, fontSize: 14 }}>{pair.left}</div>
                  <span style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>↔</span>
                  <div style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 6, fontSize: 14 }}>{pair.right}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Correct Order */}
        {question.correctOrder && question.correctOrder.length > 0 && (
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Correct Order</h3>
            </div>
            <div style={{ padding: 16 }}>
              {question.correctOrder.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ padding: '8px 12px', flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        {question.explanation && (
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Explanation</h3>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{question.explanation}</p>
            </div>
          </div>
        )}

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Tags</h3>
            </div>
            <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {question.tags.map((tag, i) => (
                <span key={i} style={{ padding: '4px 12px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, fontSize: 13, border: '1px solid #bfdbfe' }}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => router.back()} className="lms-btn lms-btn-secondary" style={{ padding: '8px 20px' }}>Back</button>
          <Link href="/teacher/questions" className="lms-btn" style={{ padding: '8px 20px', textDecoration: 'none' }}>All Questions</Link>
          {canModify ? (
            <>
              <Link href={`/teacher/questions/${questionId}/edit`} className="lms-btn lms-btn-primary" style={{ padding: '8px 20px', textDecoration: 'none' }}>Edit Question</Link>
              <button onClick={handleToggleActive} className="lms-btn" style={{ padding: '8px 20px' }}>
                {question.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="lms-btn lms-btn-danger" style={{ padding: '8px 20px' }}>
                {deleting ? 'Deleting...' : 'Delete Question'}
              </button>
            </>
          ) : (
            <span style={{ fontSize: 13, color: '#ea580c', background: '#fff7ed', padding: '6px 14px', borderRadius: 6, border: '1px solid #fed7aa' }}>
              Editing locked — exam is {examStatus}
            </span>
          )}
        </div>
      </div>
    </LMSLayout>
  );
}
