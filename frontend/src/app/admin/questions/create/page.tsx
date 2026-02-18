'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface Category {
  _id: string;
  name: string;
  subject?: string;
}

interface ExamOption {
  _id: string;
  title: string;
  status: string;
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

const defaultQuestion: QuestionForm = {
  questionText: '',
  questionType: 'mcq-single',
  category: '',
  difficulty: 'medium',
  marks: 1,
  negativeMarks: 0,
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  correctAnswer: '',
  explanation: '',
  tags: [],
  matchPairs: [{ left: '', right: '' }, { left: '', right: '' }],
  correctOrder: ['', '', ''],
  imageUrl: '',
  answerTolerance: 0,
};

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'mcq-single', label: 'Multiple Choice (Single)', icon: '○' },
  { value: 'mcq-multiple', label: 'Multiple Choice (Multi)', icon: '☐' },
  { value: 'true-false', label: 'True / False', icon: '✓✗' },
  { value: 'fill-blank', label: 'Fill in the Blank', icon: '___' },
  { value: 'short-answer', label: 'Short Answer', icon: 'Aa' },
  { value: 'numerical', label: 'Numerical', icon: '#' },
  { value: 'long-answer', label: 'Essay / Long Answer', icon: '¶' },
  { value: 'matching', label: 'Matching', icon: '↔' },
  { value: 'ordering', label: 'Ordering / Sequence', icon: '↕' },
  { value: 'image-based', label: 'Image Based', icon: '🖼' },
  { value: 'code', label: 'Code / Programming', icon: '<>' },
];

export default function CreateQuestionPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [question, setQuestion] = useState<QuestionForm>({ ...defaultQuestion });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin' && user?.role !== 'teacher') { router.push('/my'); return; }
    fetchCategories();
    fetchExams();
  }, [isAuthenticated, user, router]);

  const rolePrefix = user?.role === 'teacher' ? '/teacher' : '/admin';

  const fetchExams = async () => {
    try {
      const response = await api.get(`${rolePrefix}/exams`);
      const list = response.data.data?.exams || response.data.exams || [];
      setExams(list.filter((e: ExamOption) => e.status === 'draft'));
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get(`${rolePrefix}/categories`);
      setCategories(response.data.data?.categories || response.data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestion(prev => ({ ...prev, [name]: name === 'marks' || name === 'negativeMarks' || name === 'answerTolerance' ? Number(value) : value }));
    setError('');
  };

  const handleTypeChange = (type: QuestionType) => {
    const newQ: QuestionForm = { ...defaultQuestion, questionType: type, category: question.category, difficulty: question.difficulty, marks: question.marks, negativeMarks: question.negativeMarks, tags: question.tags };
    if (type === 'true-false') {
      newQ.options = [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }];
    }
    setQuestion(newQ);
    setError('');
  };

  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...question.options];
    if (field === 'isCorrect') {
      if (question.questionType === 'mcq-single' || question.questionType === 'true-false') {
        newOptions.forEach((o, i) => { o.isCorrect = i === index; });
      } else {
        newOptions[index].isCorrect = value as boolean;
      }
    } else {
      newOptions[index].text = value as string;
    }
    setQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    if (question.options.length < 8) {
      setQuestion(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }));
    }
  };

  const removeOption = (index: number) => {
    if (question.options.length > 2) {
      setQuestion(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
    }
  };

  const handleMatchPairChange = (index: number, side: 'left' | 'right', value: string) => {
    const pairs = [...question.matchPairs];
    pairs[index][side] = value;
    setQuestion(prev => ({ ...prev, matchPairs: pairs }));
  };

  const addMatchPair = () => {
    if (question.matchPairs.length < 8) {
      setQuestion(prev => ({ ...prev, matchPairs: [...prev.matchPairs, { left: '', right: '' }] }));
    }
  };

  const removeMatchPair = (index: number) => {
    if (question.matchPairs.length > 2) {
      setQuestion(prev => ({ ...prev, matchPairs: prev.matchPairs.filter((_, i) => i !== index) }));
    }
  };

  const handleOrderItemChange = (index: number, value: string) => {
    const order = [...question.correctOrder];
    order[index] = value;
    setQuestion(prev => ({ ...prev, correctOrder: order }));
  };

  const addOrderItem = () => {
    if (question.correctOrder.length < 10) {
      setQuestion(prev => ({ ...prev, correctOrder: [...prev.correctOrder, ''] }));
    }
  };

  const removeOrderItem = (index: number) => {
    if (question.correctOrder.length > 2) {
      setQuestion(prev => ({ ...prev, correctOrder: prev.correctOrder.filter((_, i) => i !== index) }));
    }
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
    if (!selectedExamId) return 'Please select an exam';
    if (!question.questionText.trim()) return 'Question text is required';
    const type = question.questionType;
    if (type === 'mcq-single' || type === 'mcq-multiple') {
      const filled = question.options.filter(o => o.text.trim());
      if (filled.length < 2) return 'At least 2 options are required';
      if (!filled.some(o => o.isCorrect)) return 'Please select at least one correct answer';
      if (type === 'mcq-single' && filled.filter(o => o.isCorrect).length > 1) return 'Single choice: select only one correct answer';
    }
    if (type === 'true-false' && !question.options.some(o => o.isCorrect)) return 'Please select True or False';
    if ((type === 'fill-blank' || type === 'short-answer') && !question.correctAnswer.trim()) return 'Correct answer is required';
    if (type === 'numerical' && (question.correctAnswer === '' || isNaN(Number(question.correctAnswer)))) return 'A valid numerical answer is required';
    if (type === 'matching') {
      const valid = question.matchPairs.filter(p => p.left.trim() && p.right.trim());
      if (valid.length < 2) return 'At least 2 complete match pairs required';
    }
    if (type === 'ordering') {
      const valid = question.correctOrder.filter(s => s.trim());
      if (valid.length < 2) return 'At least 2 items required for ordering';
    }
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
    if (type === 'image-based') { base.imageUrl = question.imageUrl; base.correctAnswer = question.correctAnswer; }
    return base;
  };

  const handleSubmit = async (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    const err = validateForm();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const payload = buildPayload();
      await api.post(`${rolePrefix}/exams/${selectedExamId}/questions`, payload);
      setSuccess('Question created successfully!');
      if (addAnother) {
        setQuestion(prev => ({ ...defaultQuestion, questionType: prev.questionType, category: prev.category, difficulty: prev.difficulty, marks: prev.marks, negativeMarks: prev.negativeMarks, tags: [] }));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setTimeout(() => router.push(`${rolePrefix}/questions`), 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const renderOptionsSection = () => {
    const type = question.questionType;

    if (type === 'true-false') {
      return (
        <div className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Correct Answer</h3>
          </div>
          <div style={{ padding: '16px', display: 'flex', gap: '16px' }}>
            {['True', 'False'].map((label, i) => (
              <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', border: `2px solid ${question.options[i]?.isCorrect ? '#22c55e' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', background: question.options[i]?.isCorrect ? '#f0fdf4' : 'transparent', transition: 'all 0.2s' }}>
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
        <div className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Options {type === 'mcq-multiple' ? '(select all correct)' : '(select one correct)'}</h3>
          </div>
          <div style={{ padding: '16px' }}>
            {question.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input type={type === 'mcq-multiple' ? 'checkbox' : 'radio'} name="correctOpt" checked={opt.isCorrect} onChange={() => handleOptionChange(i, 'isCorrect', !opt.isCorrect)} title="Mark correct" style={{ accentColor: '#22c55e' }} />
                <span style={{ width: '24px', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>{String.fromCharCode(65 + i)}.</span>
                <input type="text" value={opt.text} onChange={e => handleOptionChange(i, 'text', e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="lms-input" style={{ flex: 1 }} />
                {question.options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}>×</button>
                )}
              </div>
            ))}
            {question.options.length < 8 && (
              <button type="button" onClick={addOption} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>+ Add option</button>
            )}
            <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>{type === 'mcq-multiple' ? 'Check all correct answers' : 'Select the correct answer'}</p>
          </div>
        </div>
      );
    }

    if (type === 'fill-blank' || type === 'short-answer') {
      return (
        <div className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>{type === 'fill-blank' ? 'Expected Answer (Fill in the Blank)' : 'Expected Answer'}</h3>
          </div>
          <div style={{ padding: '16px' }}>
            <input type="text" name="correctAnswer" value={question.correctAnswer} onChange={handleChange} placeholder={type === 'fill-blank' ? 'The word/phrase that fills the blank' : 'Expected short answer'} className="lms-input" style={{ width: '100%' }} />
            <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>{type === 'fill-blank' ? 'Use ___ in question text for blank position.' : 'Case-insensitive matching.'}</p>
          </div>
        </div>
      );
    }

    if (type === 'numerical') {
      return (
        <div className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Numerical Answer</h3>
          </div>
          <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Correct Answer *</label>
              <input type="number" name="correctAnswer" value={question.correctAnswer} onChange={handleChange} placeholder="e.g., 42" className="lms-input" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Tolerance (±)</label>
              <input type="number" name="answerTolerance" value={question.answerTolerance} onChange={handleChange} min="0" step="0.01" placeholder="0" className="lms-input" style={{ width: '100%' }} />
              <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>Acceptable margin of error</p>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'long-answer' || type === 'code') {
      return (
        <div className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>{type === 'code' ? 'Expected Solution' : 'Grading Guidelines'}</h3>
          </div>
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{type === 'code' ? 'Provide expected solution. Requires manual grading.' : 'Essay requires manual grading. Add model answer below.'}</p>
            <textarea name="correctAnswer" value={question.correctAnswer} onChange={handleChange} rows={5} className="lms-input" style={{ width: '100%', fontFamily: type === 'code' ? 'monospace' : 'inherit' }} placeholder={type === 'code' ? 'def solution():\n    pass' : 'Enter grading guidelines...'} />
          </div>
        </div>
      );
    }

    if (type === 'matching') {
      return (
        <div className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Match Pairs</h3>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Left (Premise)</span>
              <span></span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Right (Response)</span>
              <span></span>
            </div>
            {question.matchPairs.map((pair, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <input type="text" value={pair.left} onChange={e => handleMatchPairChange(i, 'left', e.target.value)} placeholder={`Item ${i + 1}`} className="lms-input" />
                <span style={{ textAlign: 'center', color: 'var(--text-muted)' }}>↔</span>
                <input type="text" value={pair.right} onChange={e => handleMatchPairChange(i, 'right', e.target.value)} placeholder={`Match ${i + 1}`} className="lms-input" />
                {question.matchPairs.length > 2 ? (
                  <button type="button" onClick={() => removeMatchPair(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
                ) : <span></span>}
              </div>
            ))}
            {question.matchPairs.length < 8 && (
              <button type="button" onClick={addMatchPair} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>+ Add pair</button>
            )}
          </div>
        </div>
      );
    }

    if (type === 'ordering') {
      return (
        <div className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Correct Order</h3>
          </div>
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>Enter items in correct order. Students will see them shuffled.</p>
            {question.correctOrder.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '24px', textAlign: 'center', fontWeight: 500, color: 'var(--text-muted)' }}>{i + 1}.</span>
                <input type="text" value={item} onChange={e => handleOrderItemChange(i, e.target.value)} placeholder={`Step ${i + 1}`} className="lms-input" style={{ flex: 1 }} />
                {question.correctOrder.length > 2 && (
                  <button type="button" onClick={() => removeOrderItem(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
                )}
              </div>
            ))}
            {question.correctOrder.length < 10 && (
              <button type="button" onClick={addOrderItem} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>+ Add item</button>
            )}
          </div>
        </div>
      );
    }

    if (type === 'image-based') {
      return (
        <div className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Image &amp; Answer</h3>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Image URL</label>
              <input type="url" name="imageUrl" value={question.imageUrl} onChange={handleChange} placeholder="https://example.com/image.png" className="lms-input" style={{ width: '100%' }} />
            </div>
            {question.imageUrl && (
              <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                <img src={question.imageUrl} alt="Preview" style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--border)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Expected Answer</label>
            <input type="text" name="correctAnswer" value={question.correctAnswer} onChange={handleChange} placeholder="Expected answer based on the image" className="lms-input" style={{ width: '100%' }} />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <LMSLayout pageTitle="Create Question" breadcrumbs={[{ label: 'Dashboard', href: `${rolePrefix}/dashboard` }, { label: 'Questions', href: `${rolePrefix}/questions` }, { label: 'Create' }]}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', fontSize: '14px' }}>{error}</div>
        )}
        {success && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '8px', fontSize: '14px' }}>{success}</div>
        )}

        <form onSubmit={e => handleSubmit(e, false)}>
          {/* Target Exam */}
          <div className="lms-card" style={{ marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Target Exam</h3>
            </div>
            <div style={{ padding: '16px' }}>
              <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="lms-input" style={{ width: '100%' }} title="Select exam">
                <option value="">-- Select a draft exam --</option>
                {exams.map(ex => <option key={ex._id} value={ex._id}>{ex.title}</option>)}
              </select>
              {exams.length === 0 && <p style={{ marginTop: '8px', fontSize: '13px', color: '#d97706' }}>No draft exams found. Create an exam first.</p>}
            </div>
          </div>

          {/* Question Type Selector */}
          <div className="lms-card" style={{ marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Type</h3>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
                {QUESTION_TYPES.map(qt => (
                  <button key={qt.value} type="button" onClick={() => handleTypeChange(qt.value)}
                    style={{ padding: '10px 12px', border: `2px solid ${question.questionType === qt.value ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '8px', background: question.questionType === qt.value ? 'var(--primary-light, #e8f0fe)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontSize: '13px' }}>
                    <span style={{ fontSize: '16px', marginRight: '6px' }}>{qt.icon}</span>{qt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question Details */}
          <div className="lms-card" style={{ marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Details</h3>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Category</label>
                  <select name="category" value={question.category} onChange={handleChange} className="lms-input" style={{ width: '100%' }} title="Category">
                    <option value="">No category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}{c.subject ? ` (${c.subject})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Difficulty</label>
                  <select name="difficulty" value={question.difficulty} onChange={handleChange} className="lms-input" style={{ width: '100%' }} title="Difficulty">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Marks</label>
                  <input type="number" name="marks" value={question.marks} onChange={handleChange} min="0" step="0.5" className="lms-input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Negative Marks</label>
                  <input type="number" name="negativeMarks" value={question.negativeMarks} onChange={handleChange} min="0" step="0.25" className="lms-input" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Question Text *</label>
                <textarea name="questionText" value={question.questionText} onChange={handleChange} rows={4} className="lms-input" style={{ width: '100%' }} placeholder="Enter your question here..." />
              </div>
            </div>
          </div>

          {renderOptionsSection()}

          {/* Explanation */}
          <div className="lms-card" style={{ marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Explanation (Optional)</h3>
            </div>
            <div style={{ padding: '16px' }}>
              <textarea name="explanation" value={question.explanation} onChange={handleChange} rows={3} className="lms-input" style={{ width: '100%' }} placeholder="Explain the correct answer (shown after submission)" />
            </div>
          </div>

          {/* Tags */}
          <div className="lms-card" style={{ marginBottom: '16px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Tags</h3>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} className="lms-input" style={{ flex: 1 }} placeholder="Add tags..." />
                <button type="button" onClick={addTag} className="lms-btn lms-btn-secondary" style={{ padding: '6px 16px' }}>Add</button>
              </div>
              {question.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {question.tags.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '13px' }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '32px' }}>
            <Link href={`${rolePrefix}/questions`} className="lms-btn lms-btn-secondary" style={{ padding: '8px 20px', textDecoration: 'none' }}>Cancel</Link>
            <button type="button" onClick={(e) => handleSubmit(e as any, true)} disabled={loading} className="lms-btn lms-btn-secondary" style={{ padding: '8px 20px' }}>{loading ? 'Saving...' : 'Save & Add Another'}</button>
            <button type="submit" disabled={loading} className="lms-btn lms-btn-primary" style={{ padding: '8px 20px' }}>{loading ? 'Saving...' : 'Save Question'}</button>
          </div>
        </form>
      </div>
    </LMSLayout>
  );
}
