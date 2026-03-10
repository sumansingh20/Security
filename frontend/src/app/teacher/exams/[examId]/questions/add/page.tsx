'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface MatchPair { left: string; right: string; }

type QuestionType = 'mcq-single' | 'mcq-multiple' | 'true-false' | 'fill-blank' | 'numerical' | 'short-answer' | 'long-answer' | 'matching' | 'ordering' | 'image-based' | 'code';

interface QuestionForm {
  questionText: string;
  questionType: QuestionType;
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
  codeLanguage: string;
}

const defaultQuestion: QuestionForm = {
  questionText: '',
  questionType: 'mcq-single',
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
  codeLanguage: 'javascript',
};

const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'mcq-single', label: 'MCQ (Single)', icon: '○' },
  { value: 'mcq-multiple', label: 'MCQ (Multi)', icon: '☐' },
  { value: 'true-false', label: 'True / False', icon: 'T/F' },
  { value: 'fill-blank', label: 'Fill in Blank', icon: '___' },
  { value: 'short-answer', label: 'Short Answer', icon: 'Aa' },
  { value: 'numerical', label: 'Numerical', icon: '#' },
  { value: 'long-answer', label: 'Essay', icon: '¶' },
  { value: 'matching', label: 'Matching', icon: '↔' },
  { value: 'ordering', label: 'Ordering', icon: '↕' },
  { value: 'image-based', label: 'Image Based', icon: 'IMG' },
  { value: 'code', label: 'Code', icon: '</>' },
];

export default function TeacherAddQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user, isAuthenticated } = useAuthStore();
  const rolePrefix = user?.role === 'teacher' ? '/teacher' : '/admin';

  const [question, setQuestion] = useState<QuestionForm>({ ...defaultQuestion });
  const [loading, setLoading] = useState(false);
  const [addAnother, setAddAnother] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [examStatus, setExamStatus] = useState<string>('draft');
  const [examTitle, setExamTitle] = useState<string>('');
  const [pageLoading, setPageLoading] = useState(true);

  // Fetch exam info to check if it's in draft status
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await api.get(`${rolePrefix}/exams/${examId}`);
        const examData = res.data.data?.exam || res.data.data;
        setExamStatus(examData?.status || 'draft');
        setExamTitle(examData?.title || '');
      } catch (err: any) {
        toast.error('Failed to load exam info');
      } finally {
        setPageLoading(false);
      }
    };
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher')) fetchExam();
  }, [examId, rolePrefix, isAuthenticated, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestion(prev => ({ ...prev, [name]: ['marks', 'negativeMarks', 'answerTolerance'].includes(name) ? Number(value) : value }));
  };

  const handleTypeChange = (type: QuestionType) => {
    const newQ: QuestionForm = { ...defaultQuestion, questionType: type, difficulty: question.difficulty, marks: question.marks, negativeMarks: question.negativeMarks, tags: question.tags };
    if (type === 'true-false') {
      newQ.options = [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }];
    }
    setQuestion(newQ);
  };

  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...question.options];
    if (field === 'isCorrect') {
      if (question.questionType === 'mcq-single' || question.questionType === 'true-false' || question.questionType === 'image-based') {
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
    if (type === 'image-based') {
      if (!question.imageUrl.trim()) return 'Image URL is required for image-based questions';
      const filled = question.options.filter(o => o.text.trim());
      if (filled.length >= 2 && !filled.some(o => o.isCorrect)) return 'Select the correct answer option';
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
    if (type === 'long-answer') base.correctAnswer = question.correctAnswer || '';
    if (type === 'code') { base.correctAnswer = question.correctAnswer || ''; base.codeLanguage = question.codeLanguage; }
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

  const handleSubmit = async (e: React.FormEvent, another = false) => {
    e.preventDefault();
    if (!['draft', 'published'].includes(examStatus)) {
      toast.error('Cannot add questions — exam is ongoing or completed');
      return;
    }
    const err = validateForm();
    if (err) { toast.error(err); return; }
    setLoading(true);
    try {
      const payload = buildPayload();
      await api.post(`${rolePrefix}/exams/${examId}/questions`, payload);
      toast.success('Question added successfully!');
      if (another) {
        setQuestion(prev => ({ ...defaultQuestion, questionType: prev.questionType, difficulty: prev.difficulty, marks: prev.marks, negativeMarks: prev.negativeMarks, tags: [] }));
        if (question.questionType === 'true-false') {
          setQuestion(prev => ({ ...prev, options: [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }] }));
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setTimeout(() => router.push(`${rolePrefix}/exams/${examId}/questions`), 800);
      }
    } catch (err: any) {
      const data = err.response?.data;
      let msg = data?.error || data?.message || 'Failed to add question';
      // If validation errors, show first field error
      if (data?.details?.errors && Array.isArray(data.details.errors)) {
        const fieldErr = data.details.errors[0];
        msg = fieldErr?.message || msg;
      }
      toast.error(msg);
      console.error('Add question error:', err.response?.status, data);
    } finally {
      setLoading(false);
    }
  };

  const renderAnswerSection = () => {
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
                <input type={type === 'mcq-multiple' ? 'checkbox' : 'radio'} name="correctOpt" checked={opt.isCorrect} onChange={() => handleOptionChange(i, 'isCorrect', !opt.isCorrect)} style={{ accentColor: '#22c55e' }} />
                <span style={{ width: 24, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>{String.fromCharCode(65 + i)}.</span>
                <input type="text" value={opt.text} onChange={e => handleOptionChange(i, 'text', e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="lms-input" style={{ flex: 1 }} />
                {question.options.length > 2 && <button type="button" onClick={() => removeOption(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>}
              </div>
            ))}
            {question.options.length < 8 && <button type="button" onClick={addOption} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>+ Add option</button>}
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
            <input type="text" name="correctAnswer" value={question.correctAnswer} onChange={handleChange} placeholder={type === 'fill-blank' ? 'The word/phrase that fills the blank' : 'Expected short answer'} className="lms-input" style={{ width: '100%' }} />
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>{type === 'fill-blank' ? 'Use ___ in question text for blank position.' : 'Case-insensitive matching.'}</p>
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
              <input type="number" name="answerTolerance" value={question.answerTolerance} onChange={handleChange} min="0" step="0.01" placeholder="0" className="lms-input" style={{ width: '100%' }} />
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
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{type === 'code' ? 'Provide expected solution. Requires manual grading.' : 'Essay requires manual grading.'}</p>
            <textarea name="correctAnswer" value={question.correctAnswer} onChange={handleChange} rows={5} className="lms-input" style={{ width: '100%', fontFamily: type === 'code' ? 'monospace' : 'inherit' }} placeholder={type === 'code' ? 'def solution():\n    pass' : 'Enter grading guidelines...'} />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Left (Premise)</span><span></span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Right (Response)</span><span></span>
            </div>
            {question.matchPairs.map((pair, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr 40px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input type="text" value={pair.left} onChange={e => handleMatchPairChange(i, 'left', e.target.value)} placeholder={`Item ${i + 1}`} className="lms-input" />
                <span style={{ textAlign: 'center', color: 'var(--text-muted)' }}>↔</span>
                <input type="text" value={pair.right} onChange={e => handleMatchPairChange(i, 'right', e.target.value)} placeholder={`Match ${i + 1}`} className="lms-input" />
                {question.matchPairs.length > 2 ? <button type="button" onClick={() => removeMatchPair(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button> : <span></span>}
              </div>
            ))}
            {question.matchPairs.length < 8 && <button type="button" onClick={addMatchPair} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>+ Add pair</button>}
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
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Enter items in correct order. Students will see them shuffled.</p>
            {question.correctOrder.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 24, textAlign: 'center', fontWeight: 500, color: 'var(--text-muted)' }}>{i + 1}.</span>
                <input type="text" value={item} onChange={e => handleOrderItemChange(i, e.target.value)} placeholder={`Step ${i + 1}`} className="lms-input" style={{ flex: 1 }} />
                {question.correctOrder.length > 2 && <button type="button" onClick={() => removeOrderItem(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>}
              </div>
            ))}
            {question.correctOrder.length < 10 && <button type="button" onClick={addOrderItem} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>+ Add item</button>}
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Image URL *</label>
              <input type="url" name="imageUrl" value={question.imageUrl} onChange={handleChange} placeholder="https://example.com/image.png" className="lms-input" style={{ width: '100%' }} />
              {question.imageUrl && (
                <div style={{ marginTop: 12, textAlign: 'center', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <img src={question.imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 4 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
          </div>
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Answer Options (select one correct)</h3>
              {question.options.length < 8 && <button type="button" onClick={addOption} className="lms-btn lms-btn-secondary" style={{ padding: '4px 12px', fontSize: 13 }}>+ Add</button>}
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Add options for students to choose from, or provide a text answer below.</p>
              {question.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${opt.isCorrect ? '#22c55e' : 'var(--border)'}`, background: opt.isCorrect ? '#f0fdf4' : 'transparent' }}>
                  <input type="radio" name="imgCorrectOpt" checked={opt.isCorrect} onChange={() => handleOptionChange(i, 'isCorrect', true)} style={{ accentColor: '#22c55e', width: 18, height: 18 }} />
                  <span style={{ width: 24, color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>{String.fromCharCode(65 + i)}.</span>
                  <input type="text" value={opt.text} onChange={e => handleOptionChange(i, 'text', e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="lms-input" style={{ flex: 1 }} />
                  {question.options.length > 2 && <button type="button" onClick={() => removeOption(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>}
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Or: Text Answer (if no options)</label>
                <input type="text" name="correctAnswer" value={question.correctAnswer} onChange={handleChange} placeholder="Expected text answer based on the image" className="lms-input" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'teacher')) return null;

  if (pageLoading) {
    return (
      <LMSLayout pageTitle="Add Question">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      </LMSLayout>
    );
  }

  if (!['draft', 'published'].includes(examStatus)) {
    return (
      <LMSLayout pageTitle="Add Question">
        <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
          <div className="lms-card" style={{ padding: 32 }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#dc2626', marginBottom: 12 }}>Cannot Add Questions</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              This exam is in <strong>{examStatus}</strong> status. Questions can only be added when the exam is in <strong>draft</strong> or <strong>published</strong> status.
            </p>
            <Link href={`${rolePrefix}/exams/${examId}/questions`} className="lms-btn lms-btn-primary" style={{ textDecoration: 'none' }}>Back to Questions</Link>
          </div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Add Question"
      breadcrumbs={[
        { label: 'Teacher', href: '/teacher' },
        { label: 'Examinations', href: '/teacher/exams' },
        { label: 'Exam', href: `${rolePrefix}/exams/${examId}` },
        { label: 'Questions', href: `${rolePrefix}/exams/${examId}/questions` },
        { label: 'Add' },
      ]}
    >
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <form onSubmit={e => handleSubmit(e, false)}>
          {/* Question Type Selector */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Type</h3>
            </div>
            <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUESTION_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => handleTypeChange(t.value)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: `2px solid ${question.questionType === t.value ? 'var(--primary)' : 'var(--border)'}`,
                    background: question.questionType === t.value ? 'var(--primary-light, #e8f0fe)' : 'transparent',
                    color: question.questionType === t.value ? 'var(--primary)' : 'var(--text-primary)',
                    cursor: 'pointer', fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question Text */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Question Text *</h3>
            </div>
            <div style={{ padding: 16 }}>
              <textarea name="questionText" value={question.questionText} onChange={handleChange} rows={4} className="lms-input" style={{ width: '100%' }} placeholder="Enter the question text..." />
            </div>
          </div>

          {/* Answer Section */}
          {renderAnswerSection()}

          {/* Settings Row */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Settings</h3>
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Marks *</label>
                <input type="number" name="marks" value={question.marks} onChange={handleChange} min="0" step="0.5" className="lms-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Negative Marks</label>
                <input type="number" name="negativeMarks" value={question.negativeMarks} onChange={handleChange} min="0" step="0.25" className="lms-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Difficulty</label>
                <select name="difficulty" value={question.difficulty} onChange={handleChange} className="lms-select" style={{ width: '100%' }} title="Difficulty">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Explanation (optional)</h3>
            </div>
            <div style={{ padding: 16 }}>
              <textarea name="explanation" value={question.explanation} onChange={handleChange} rows={3} className="lms-input" style={{ width: '100%' }} placeholder="Explain the correct answer..." />
            </div>
          </div>

          {/* Tags */}
          <div className="lms-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Tags (optional)</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add a tag..." className="lms-input" style={{ flex: 1 }} />
                <button type="button" onClick={addTag} className="lms-btn lms-btn-secondary" style={{ padding: '6px 16px' }}>Add</button>
              </div>
              {question.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {question.tags.map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12, background: 'var(--primary-light, #e8f0fe)', color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>
                      {tag} <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href={`${rolePrefix}/exams/${examId}/questions`} className="lms-btn" style={{ textDecoration: 'none' }}>Cancel</Link>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={(e) => handleSubmit(e as any, true)} disabled={loading} className="lms-btn lms-btn-secondary" style={{ padding: '8px 20px' }}>{loading ? 'Saving...' : 'Save & Add Another'}</button>
              <button type="submit" disabled={loading} className="lms-btn lms-btn-primary" style={{ padding: '8px 20px' }}>{loading ? 'Saving...' : 'Save Question'}</button>
            </div>
          </div>
        </form>
      </div>
    </LMSLayout>
  );
}
