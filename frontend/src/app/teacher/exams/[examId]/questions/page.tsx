'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Question {
  _id: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  marks: number;
  difficulty: string;
  isActive: boolean;
  options?: { text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  imageUrl?: string;
}

interface ExamInfo {
  _id: string;
  title: string;
  status: string;
  totalMarks: number;
}

const TYPE_LABELS: Record<string, string> = {
  'mcq-single': 'MCQ (Single)',
  'mcq-multiple': 'MCQ (Multi)',
  'true-false': 'True/False',
  'fill-blank': 'Fill Blank',
  'short-answer': 'Short Answer',
  'numerical': 'Numerical',
  'long-answer': 'Essay',
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

export default function TeacherExamQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user, isAuthenticated } = useAuthStore();
  const rolePrefix = user?.role === 'teacher' ? '/teacher' : '/admin';

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin' && user?.role !== 'teacher') { router.push('/my'); return; }
  }, [isAuthenticated, user, router]);

  const fetchData = useCallback(async () => {
    try {
      const response = await api.get(`${rolePrefix}/exams/${examId}`);
      const examData = response.data.data?.exam || response.data.data;
      const qData = response.data.data?.questions || [];
      setExam(examData);
      setQuestions(qData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [examId, rolePrefix]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher')) fetchData();
  }, [fetchData, isAuthenticated, user]);

  const handleDelete = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    setDeleting(questionId);
    try {
      await api.delete(`${rolePrefix}/questions/${questionId}`);
      setQuestions(prev => prev.filter(q => q._id !== questionId));
      toast.success('Question deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <LMSLayout pageTitle="Exam Questions">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading questions...</div>
      </LMSLayout>
    );
  }

  if (error) {
    return (
      <LMSLayout pageTitle="Exam Questions">
        <div style={{ padding: 48, textAlign: 'center', color: '#dc2626' }}>{error}</div>
      </LMSLayout>
    );
  }

  const canEdit = ['draft', 'published'].includes(exam?.status || '');
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  return (
    <LMSLayout
      pageTitle={`Questions: ${exam?.title || ''}`}
      breadcrumbs={[
        { label: 'Teacher', href: '/teacher' },
        { label: 'Examinations', href: '/teacher/exams' },
        { label: exam?.title || 'Exam', href: `${rolePrefix}/exams/${examId}` },
        { label: 'Questions' },
      ]}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{exam?.title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {questions.length} questions &middot; {totalMarks} total marks &middot; Status: <strong>{exam?.status}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canEdit && (
              <Link
                href={`${rolePrefix}/exams/${examId}/questions/add`}
                className="lms-btn lms-btn-primary"
                style={{ padding: '8px 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                + Add Question
              </Link>
            )}
            <Link href={`${rolePrefix}/exams/${examId}`} className="lms-btn" style={{ textDecoration: 'none' }}>Back to Exam</Link>
          </div>
        </div>

        {!canEdit && (
          <div className="lms-alert lms-alert-warning" style={{ marginBottom: 16 }}>
            <strong>Read Only:</strong> Questions cannot be modified. Examination is ongoing or completed.
          </div>
        )}

        {/* Stats */}
        <div className="lms-stats-row" style={{ marginBottom: 20 }}>
          <div className="lms-stat">
            <div className="lms-stat-value">{questions.length}</div>
            <div className="lms-stat-label">Total Questions</div>
          </div>
          <div className="lms-stat">
            <div className="lms-stat-value">{totalMarks}</div>
            <div className="lms-stat-label">Total Marks</div>
          </div>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="lms-card" style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 16 }}>No questions added yet.</p>
            {canEdit && (
              <Link
                href={`${rolePrefix}/exams/${examId}/questions/add`}
                className="lms-btn lms-btn-primary"
                style={{ padding: '10px 24px', textDecoration: 'none' }}
              >
                Add First Question
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((q, idx) => {
              const diff = DIFF_COLORS[q.difficulty || 'medium'] || DIFF_COLORS.medium;
              return (
                <div key={q._id} className="lms-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>Q{q.questionNumber || idx + 1}.</span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'var(--primary-light, #e8f0fe)', color: 'var(--primary)' }}>
                          {TYPE_LABELS[q.questionType] || q.questionType}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: diff.bg, color: diff.text, textTransform: 'capitalize' }}>
                          {q.difficulty || 'medium'}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#f0f9ff', color: '#0369a1' }}>
                          {q.marks} mark{q.marks !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {q.questionText.length > 200 ? q.questionText.slice(0, 200) + '...' : q.questionText}
                      </p>
                      {q.imageUrl && (
                        <div style={{ marginTop: 8 }}>
                          <img src={q.imageUrl} alt="Question" style={{ maxHeight: 80, borderRadius: 4, border: '1px solid var(--border)' }} />
                        </div>
                      )}
                      {q.options && q.options.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {q.options.slice(0, 4).map((opt, oi) => (
                            <span key={oi} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: opt.isCorrect ? '#dcfce7' : '#f3f4f6', color: opt.isCorrect ? '#16a34a' : '#6b7280', border: `1px solid ${opt.isCorrect ? '#86efac' : '#e5e7eb'}` }}>
                              {String.fromCharCode(65 + oi)}: {opt.text.length > 30 ? opt.text.slice(0, 30) + '...' : opt.text}
                            </span>
                          ))}
                          {q.options.length > 4 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>+{q.options.length - 4} more</span>}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                        <button
                          onClick={() => handleDelete(q._id)}
                          disabled={deleting === q._id}
                          className="lms-btn lms-btn-sm lms-btn-danger"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          {deleting === q._id ? '...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <Link href={`${rolePrefix}/exams/${examId}`} className="lms-btn" style={{ textDecoration: 'none' }}>Back to Exam</Link>
          <Link href="/teacher/exams" className="lms-btn" style={{ textDecoration: 'none' }}>All Examinations</Link>
        </div>
      </div>
    </LMSLayout>
  );
}
