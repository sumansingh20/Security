'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface Category {
  _id: string;
  name: string;
  subject?: string;
}

interface MatchPair {
  left: string;
  right: string;
}

type QuestionType = 'mcq-single' | 'mcq-multiple' | 'true-false' | 'fill-blank' | 'numerical' | 'short-answer' | 'long-answer' | 'matching' | 'ordering' | 'image-based' | 'code';

interface QuestionForm {
  questionText: string;
  questionType: QuestionType;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negativeMarks: number;
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation: string;
  tags: string[];
  matchPairs: MatchPair[];
  correctOrder: string[];
  imageUrl: string;
  answerTolerance: number;
}

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'mcq-single', label: 'Multiple Choice (Single)', icon: '○' },
  { value: 'mcq-multiple', label: 'Multiple Choice (Multi)', icon: '☐' },
  { value: 'true-false', label: 'True / False', icon: 'T/F' },
  { value: 'fill-blank', label: 'Fill in the Blank', icon: '___' },
  { value: 'short-answer', label: 'Short Answer', icon: 'Aa' },
  { value: 'numerical', label: 'Numerical', icon: '#' },
  { value: 'long-answer', label: 'Essay / Long Answer', icon: '¶' },
  { value: 'matching', label: 'Matching', icon: '↔' },
  { value: 'ordering', label: 'Ordering / Sequence', icon: '↕' },
  { value: 'image-based', label: 'Image Based', icon: 'IMG' },
  { value: 'code', label: 'Code / Programming', icon: '<>' },
];

export default function EditQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [question, setQuestion] = useState<QuestionForm>({
    questionText: '',
    questionType: 'mcq-single',
    category: '',
    difficulty: 'medium',
    marks: 1,
    negativeMarks: 0,
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
    correctAnswer: '',
    explanation: '',
    tags: [],
    matchPairs: [{ left: '', right: '' }, { left: '', right: '' }],
    correctOrder: ['', '', ''],
    imageUrl: '',
    answerTolerance: 0,
  });
  const [tagInput, setTagInput] = useState('');

  const rolePrefix = user?.role === 'teacher' ? '/teacher' : '/admin';

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin' && user?.role !== 'teacher') { router.push('/my'); return; }
  }, [isAuthenticated, user, router]);

  const fetchQuestion = useCallback(async () => {
    try {
      const [qRes, catRes] = await Promise.all([
        api.get(`${rolePrefix}/questions/${questionId}`),
        api.get(`${rolePrefix}/categories`).catch(() => ({ data: { data: { categories: [] } } })),
      ]);
      setCategories(catRes.data.data?.categories || catRes.data.categories || []);

      const q = qRes.data.data?.question || qRes.data.question || qRes.data.data;
      if (!q) throw new Error('Question not found');

      // Map server data to form state
      const opts = (q.options || []).map((o: any, i: number) => ({
        text: o.text || '',
        isCorrect: Array.isArray(q.correctOptions) ? q.correctOptions.includes(i) : !!o.isCorrect,
      }));

      setQuestion({
        questionText: q.questionText || '',
        questionType: q.questionType || 'mcq-single',
        category: q.category?._id || q.category || '',
        difficulty: q.difficulty || 'medium',
        marks: q.marks ?? 1,
        negativeMarks: q.negativeMarks ?? 0,
        options: opts.length >= 2 ? opts : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
        correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : '',
        explanation: q.explanation || '',
        tags: q.tags || [],
        matchPairs: (q.matchPairs && q.matchPairs.length >= 2) ? q.matchPairs : [{ left: '', right: '' }, { left: '', right: '' }],
        correctOrder: (q.correctOrder && q.correctOrder.length >= 2) ? q.correctOrder : ['', '', ''],
        imageUrl: q.imageUrl || '',
        answerTolerance: q.answerTolerance ?? 0,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load question');
    } finally {
      setLoading(false);
    }
  }, [questionId, rolePrefix]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher')) fetchQuestion();
  }, [fetchQuestion, isAuthenticated, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestion(prev => ({ ...prev, [name]: name === 'marks' || name === 'negativeMarks' || name === 'answerTolerance' ? Number(value) : value }));
    setError('');
  };

  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOpts = [...question.options];
    if (field === 'isCorrect') {
      if (question.questionType === 'mcq-single' || question.questionType === 'true-false' || question.questionType === 'image-based') {
        newOpts.forEach((o, i) => { o.isCorrect = i === index; });
      } else {
        newOpts[index].isCorrect = value as boolean;
      }
    } else {
      newOpts[index].text = value as string;
    }
    setQuestion(prev => ({ ...prev, options: newOpts }));
  };

  const addOption = () => {
    if (question.options.length < 8) setQuestion(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }));
  };
  const removeOption = (i: number) => {
    if (question.options.length > 2) setQuestion(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }));
  };

  const handleMatchPairChange = (i: number, side: 'left' | 'right', value: string) => {
    const pairs = [...question.matchPairs];
    pairs[i][side] = value;
    setQuestion(prev => ({ ...prev, matchPairs: pairs }));
  };
  const addMatchPair = () => {
    if (question.matchPairs.length < 8) setQuestion(prev => ({ ...prev, matchPairs: [...prev.matchPairs, { left: '', right: '' }] }));
  };
  const removeMatchPair = (i: number) => {
    if (question.matchPairs.length > 2) setQuestion(prev => ({ ...prev, matchPairs: prev.matchPairs.filter((_, idx) => idx !== i) }));
  };

  const handleOrderItemChange = (i: number, value: string) => {
    const order = [...question.correctOrder];
    order[i] = value;
    setQuestion(prev => ({ ...prev, correctOrder: order }));
  };
  const addOrderItem = () => {
    if (question.correctOrder.length < 10) setQuestion(prev => ({ ...prev, correctOrder: [...prev.correctOrder, ''] }));
  };
  const removeOrderItem = (i: number) => {
    if (question.correctOrder.length > 2) setQuestion(prev => ({ ...prev, correctOrder: prev.correctOrder.filter((_, idx) => idx !== i) }));
  };

  const addTag = () => {
    if (tagInput.trim() && !question.tags.includes(tagInput.trim())) {
      setQuestion(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };
  const removeTag = (tag: string) => {
    setQuestion(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const validateForm = (): string | null => {
    if (!question.questionText.trim()) return 'Question text is required';
    const type = question.questionType;
    if (type === 'mcq-single' || type === 'mcq-multiple') {
      const filled = question.options.filter(o => o.text.trim());
      if (filled.length < 2) return 'At least 2 options needed';
      if (!filled.some(o => o.isCorrect)) return 'Select at least one correct answer';
      if (type === 'mcq-single' && filled.filter(o => o.isCorrect).length > 1) return 'Single choice: select only one correct answer';
    }
    if (type === 'true-false' && !question.options.some(o => o.isCorrect)) return 'Select True or False';
    if ((type === 'fill-blank' || type === 'short-answer') && !question.correctAnswer.trim()) return 'Correct answer is required';
    if (type === 'numerical' && (question.correctAnswer === '' || isNaN(Number(question.correctAnswer)))) return 'A valid numerical answer is required';
    if (type === 'matching') {
      if (question.matchPairs.filter(p => p.left.trim() && p.right.trim()).length < 2) return 'At least 2 match pairs required';
    }
    if (type === 'ordering') {
      if (question.correctOrder.filter(s => s.trim()).length < 2) return 'At least 2 ordering items needed';
    }
    if (type === 'image-based' && !question.imageUrl.trim()) return 'Image URL is required';
    return null;
  };

  const buildPayload = () => {
    const type = question.questionType;
    const base: Record<string, unknown> = {
      questionText: question.questionText,
      questionType: type,
      marks: question.marks,
      negativeMarks: question.negativeMarks,
      explanation: question.explanation,
      difficulty: question.difficulty,
      tags: question.tags,
      category: question.category || undefined,
    };
    if (type === 'mcq-single' || type === 'mcq-multiple') {
      const filled = question.options.filter(o => o.text.trim());
      base.options = filled.map(o => ({ text: o.text }));
      base.correctOptions = filled.map((o, i) => o.isCorrect ? i : -1).filter(i => i >= 0);
    }
    if (type === 'true-false') {
      base.options = question.options.map(o => ({ text: o.text }));
      base.correctOptions = question.options.map((o, i) => o.isCorrect ? i : -1).filter(i => i >= 0);
    }
    if (type === 'fill-blank' || type === 'short-answer') base.correctAnswer = question.correctAnswer;
    if (type === 'numerical') { base.correctAnswer = Number(question.correctAnswer); base.answerTolerance = question.answerTolerance; }
    if (type === 'long-answer' || type === 'code') base.correctAnswer = question.correctAnswer || null;
    if (type === 'matching') base.matchPairs = question.matchPairs.filter(p => p.left.trim() && p.right.trim());
    if (type === 'ordering') base.correctOrder = question.correctOrder.filter(s => s.trim());
    if (type === 'image-based') {
      base.imageUrl = question.imageUrl;
      const filled = question.options.filter(o => o.text.trim());
      if (filled.length >= 2) {
        base.options = filled.map(o => ({ text: o.text }));
        base.correctOptions = filled.map((o, i) => o.isCorrect ? i : -1).filter(i => i >= 0);
      } else {
        base.correctAnswer = question.correctAnswer;
      }
    }
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    try {
      await api.put(`${rolePrefix}/questions/${questionId}`, buildPayload());
      setSuccess('Question updated successfully!');
      setTimeout(() => router.push(`${rolePrefix}/questions`), 1200);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update question');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LMSLayout pageTitle="Edit Question">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading question...</div>
      </LMSLayout>
    );
  }

  const renderOptionsSection = () => {
    const type = question.questionType;

    if (type === 'true-false') {
      return (
        <div className="lms-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Correct Answer</h3>
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 16 }}>
            {['True', 'False'].map((label, i) => (
              <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', border: `2px solid ${question.options[i]?.isCorrect ? '#22c55e' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: question.options[i]?.isCorrect ? '#f0fdf4' : 'transparent' }}>
                <input type="radio" name="tfAnswer" checked={question.options[i]?.isCorrect || false} onChange={() => setQuestion(prev => ({ ...prev, options: [{ text: 'True', isCorrect: i === 0 }, { text: 'False', isCorrect: i === 1 }] }))} />
                <span style={{ fontWeight: 500 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'mcq-single' || type === 'mcq-multiple') {
      return (
        <div className="lms-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Options {type === 'mcq-multiple' ? '(select all correct)' : '(select one correct)'}</h3>
          </div>
          <div style={{ padding: 16 }}>
            {question.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input type={type === 'mcq-multiple' ? 'checkbox' : 'radio'} name="correctOpt" checked={opt.isCorrect} onChange={() => handleOptionChange(i, 'isCorrect', !opt.isCorrect)} title="Mark correct" style={{ accentColor: '#22c55e' }} />
                <span style={{ width: 24, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>{String.fromCharCode(65 + i)}.</span>
                <input type="text" value={opt.text} onChange={e => handleOptionChange(i, 'text', e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="lms-input" style={{ flex: 1 }} />
                {question.options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>×</button>
                )}
              </div>
            ))}
            {question.options.length < 8 && (
              <button type="button" onClick={addOption} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>+ Add option</button>
            )}
          </div>
        </div>
      );
    }

    if (type === 'fill-blank' || type === 'short-answer') {
      return (
        <div className="lms-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>{type === 'fill-blank' ? 'Expected Answer (Fill in the Blank)' : 'Expected Answer'}</h3>
          </div>
          <div style={{ padding: 16 }}>
            <input type="text" name="correctAnswer" value={question.correctAnswer} onChange={handleChange} placeholder={type === 'fill-blank' ? 'The word/phrase for the blank' : 'Expected short answer'} className="lms-input" style={{ width: '100%' }} />
          </div>
        </div>
      );
    }

    if (type === 'numerical') {
      return (
        <div className="lms-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Numerical Answer</h3>
          </div>
          <div style={{ padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Correct Answer *</label>
              <input type="number" name="correctAnswer" value={question.correctAnswer} onChange={handleChange} placeholder="e.g., 42" className="lms-input" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Tolerance (±)</label>
              <input type="number" name="answerTolerance" value={question.answerTolerance} onChange={handleChange} min="0" step="0.01" className="lms-input" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      );
    }

    if (type === 'long-answer' || type === 'code') {
      return (
        <div className="lms-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>{type === 'code' ? 'Expected Solution' : 'Grading Guidelines'}</h3>
          </div>
          <div style={{ padding: 16 }}>
            <textarea name="correctAnswer" value={question.correctAnswer} onChange={handleChange} rows={5} className="lms-input" style={{ width: '100%', fontFamily: type === 'code' ? 'monospace' : 'inherit' }} placeholder={type === 'code' ? 'def solution():\n    pass' : 'Model answer / rubric...'} />
          </div>
        </div>
      );
    }

    if (type === 'matching') {
      return (
        <div className="lms-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Match Pairs</h3>
          </div>
          <div style={{ padding: 16 }}>
            {question.matchPairs.map((pair, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input type="text" value={pair.left} onChange={e => handleMatchPairChange(i, 'left', e.target.value)} placeholder={`Item ${i + 1}`} className="lms-input" />
                <span style={{ textAlign: 'center', color: 'var(--text-muted)' }}>↔</span>
                <input type="text" value={pair.right} onChange={e => handleMatchPairChange(i, 'right', e.target.value)} placeholder={`Match ${i + 1}`} className="lms-input" />
                {question.matchPairs.length > 2 ? (
                  <button type="button" onClick={() => removeMatchPair(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
                ) : <span />}
              </div>
            ))}
            {question.matchPairs.length < 8 && (
              <button type="button" onClick={addMatchPair} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>+ Add pair</button>
            )}
          </div>
        </div>
      );
    }

    if (type === 'ordering') {
      return (
        <div className="lms-card" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Correct Order</h3>
          </div>
          <div style={{ padding: 16 }}>
            {question.correctOrder.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 24, textAlign: 'center', fontWeight: 500, color: 'var(--text-muted)' }}>{i + 1}.</span>
                <input type="text" value={item} onChange={e => handleOrderItemChange(i, e.target.value)} placeholder={`Step ${i + 1}`} className="lms-input" style={{ flex: 1 }} />
                {question.correctOrder.length > 2 && (
                  <button type="button" onClick={() => removeOrderItem(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
                )}
              </div>
            ))}
            {question.correctOrder.length < 10 && (
              <button type="button" onClick={addOrderItem} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>+ Add item</button>
            )}
          </div>
        </div>
      );
    }

    if (type === 'image-based') {
      return (
        <>
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Image</h3>
            </div>
            <div style={{ padding: 16 }}>
              <input type="url" name="imageUrl" value={question.imageUrl} onChange={handleChange} placeholder="https://example.com/image.png" className="lms-input" style={{ width: '100%' }} />
              {question.imageUrl && (
                <div style={{ marginTop: 12, textAlign: 'center', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <img src={question.imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 4 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
          </div>
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Answer Options</h3>
            </div>
            <div style={{ padding: 16 }}>
              {question.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${opt.isCorrect ? '#22c55e' : 'var(--border)'}`, background: opt.isCorrect ? '#f0fdf4' : 'transparent' }}>
                  <input type="radio" name="imgCorrectOpt" checked={opt.isCorrect} onChange={() => handleOptionChange(i, 'isCorrect', true)} style={{ accentColor: '#22c55e' }} />
                  <span style={{ width: 24, color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>{String.fromCharCode(65 + i)}.</span>
                  <input type="text" value={opt.text} onChange={e => handleOptionChange(i, 'text', e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="lms-input" style={{ flex: 1 }} />
                  {question.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
                  )}
                </div>
              ))}
              {question.options.length < 8 && (
                <button type="button" onClick={addOption} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>+ Add option</button>
              )}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Or: Text Answer</label>
                <input type="text" name="correctAnswer" value={question.correctAnswer} onChange={handleChange} placeholder="Expected text answer" className="lms-input" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <LMSLayout pageTitle="Edit Question" breadcrumbs={[{ label: 'Dashboard', href: `${rolePrefix}/dashboard` }, { label: 'Questions', href: `${rolePrefix}/questions` }, { label: 'Edit' }]}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, fontSize: 14 }}>{error}</div>
        )}
        {success && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 8, fontSize: 14 }}>{success}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Question Type Display */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Type</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
                {QUESTION_TYPES.map(qt => (
                  <div key={qt.value} style={{ padding: '10px 12px', border: `2px solid ${question.questionType === qt.value ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, background: question.questionType === qt.value ? 'var(--primary-light, #e8f0fe)' : 'transparent', opacity: question.questionType === qt.value ? 1 : 0.5, fontSize: 13 }}>
                    <span style={{ fontSize: 16, marginRight: 6 }}>{qt.icon}</span>{qt.label}
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>Question type cannot be changed after creation.</p>
            </div>
          </div>

          {/* Question Details */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Details</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Category</label>
                  <select name="category" value={question.category} onChange={handleChange} className="lms-input" style={{ width: '100%' }} title="Category">
                    <option value="">No category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}{c.subject ? ` (${c.subject})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Difficulty</label>
                  <select name="difficulty" value={question.difficulty} onChange={handleChange} className="lms-input" style={{ width: '100%' }} title="Difficulty">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Marks</label>
                  <input type="number" name="marks" value={question.marks} onChange={handleChange} min="0" step="0.5" className="lms-input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Negative Marks</label>
                  <input type="number" name="negativeMarks" value={question.negativeMarks} onChange={handleChange} min="0" step="0.25" className="lms-input" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Question Text *</label>
                <textarea name="questionText" value={question.questionText} onChange={handleChange} rows={4} className="lms-input" style={{ width: '100%' }} placeholder="Enter your question here..." />
              </div>
            </div>
          </div>

          {renderOptionsSection()}

          {/* Explanation */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Explanation (Optional)</h3>
            </div>
            <div style={{ padding: 16 }}>
              <textarea name="explanation" value={question.explanation} onChange={handleChange} rows={3} className="lms-input" style={{ width: '100%' }} placeholder="Explain the correct answer..." />
            </div>
          </div>

          {/* Tags */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Tags</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} className="lms-input" style={{ flex: 1 }} placeholder="Add tags..." />
                <button type="button" onClick={addTag} className="lms-btn lms-btn-secondary" style={{ padding: '6px 16px' }}>Add</button>
              </div>
              {question.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {question.tags.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 13 }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 32 }}>
            <Link href={`${rolePrefix}/questions`} className="lms-btn lms-btn-secondary" style={{ padding: '8px 20px', textDecoration: 'none' }}>Cancel</Link>
            <button type="submit" disabled={saving} className="lms-btn lms-btn-primary" style={{ padding: '8px 20px' }}>{saving ? 'Saving...' : 'Update Question'}</button>
          </div>
        </form>
      </div>
    </LMSLayout>
  );
}
