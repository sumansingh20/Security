'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Option {
  text: string;
  isCorrect: boolean;
}

interface Question {
  _id?: string;
  questionText: string;
  questionType: 'MCQ' | 'MSQ' | 'numerical' | 'descriptive';
  marks: number;
  options: Option[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Exam {
  _id: string;
  title: string;
  status: string;
  questions?: Question[];
}

const defaultQuestion: Question = {
  questionText: '',
  questionType: 'MCQ',
  marks: 1,
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  correctAnswer: '',
  explanation: '',
  difficulty: 'medium',
};

export default function TeacherQuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user, isAuthenticated } = useAuthStore();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState<Question>({ ...defaultQuestion });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push('/my');
    }
  }, [isAuthenticated, user, router]);

  const fetchExam = useCallback(async () => {
    try {
      const response = await api.get(`/teacher/exams/${examId}`);
      const examData = response.data.data.exam;
      const questionsData = response.data.data.questions || [];
      setExam(examData);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Failed to fetch exam:', error);
      toast.error('Failed to load examination');
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'teacher')) {
      fetchExam();
    }
  }, [fetchExam, isAuthenticated, user]);

  const updateOption = (index: number, field: keyof Option, value: string | boolean) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    if (field === 'isCorrect' && value === true && newQuestion.questionType === 'MCQ') {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.isCorrect = false;
      });
    }
    
    setNewQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    if (newQuestion.options.length >= 8) {
      toast.error('Maximum 8 options allowed');
      return;
    }
    setNewQuestion(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }],
    }));
  };

  const removeOption = (index: number) => {
    if (newQuestion.options.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const validateQuestion = (): boolean => {
    if (!newQuestion.questionText.trim()) {
      toast.error('Please enter the question text');
      return false;
    }

    if (newQuestion.questionType === 'MCQ' || newQuestion.questionType === 'MSQ') {
      const filledOptions = newQuestion.options.filter(o => o.text.trim());
      if (filledOptions.length < 2) {
        toast.error('Please enter at least 2 options');
        return false;
      }
      
      const hasCorrect = newQuestion.options.some(o => o.isCorrect && o.text.trim());
      if (!hasCorrect) {
        toast.error('Please mark at least one correct answer');
        return false;
      }
    }

    if (newQuestion.questionType === 'numerical' && !newQuestion.correctAnswer) {
      toast.error('Please enter the correct answer');
      return false;
    }

    return true;
  };

  const handleAddQuestion = async () => {
    if (!validateQuestion()) return;

    setIsSubmitting(true);
    try {
      // Filter to only filled options
      const filledOptions = newQuestion.options.filter(o => o.text.trim());
      
      // Get indices of correct options
      const correctOptionIndices = filledOptions
        .map((opt, index) => opt.isCorrect ? index : -1)
        .filter(index => index !== -1);
      
      // Map frontend questionType to backend format
      const questionTypeMap: Record<string, string> = {
        'MCQ': 'mcq-single',
        'MSQ': 'mcq-multiple',
        'numerical': 'mcq-single',
        'descriptive': 'mcq-single',
      };
      
      const payload = {
        questionText: newQuestion.questionText,
        questionType: questionTypeMap[newQuestion.questionType] || 'mcq-single',
        marks: newQuestion.marks,
        explanation: newQuestion.explanation,
        difficulty: newQuestion.difficulty,
        options: filledOptions.map(o => ({ text: o.text })),
        correctOptions: correctOptionIndices,
      };

      await api.post(`/teacher/exams/${examId}/questions`, payload);
      toast.success('Question added successfully');
      setNewQuestion({ ...defaultQuestion });
      setShowAddForm(false);
      fetchExam();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await api.delete(`/teacher/questions/${questionId}`);
      toast.success('Question deleted');
      fetchExam();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete question');
    }
  };

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'teacher')) {
    return null;
  }

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Loading...">
        <div className="lms-loading">Loading questions...</div>
      </LMSLayout>
    );
  }

  if (!exam) {
    return (
      <LMSLayout pageTitle="Not Found">
        <div className="lms-alert lms-alert-error">Examination not found.</div>
      </LMSLayout>
    );
  }

  const canEdit = exam.status === 'draft';

  return (
    <LMSLayout
      pageTitle={`Questions: ${exam.title}`}
      breadcrumbs={[
        { label: 'Teacher' },
        { label: 'Examinations', href: '/teacher/exams' },
        { label: exam.title, href: `/teacher/exams/${examId}` },
        { label: 'Questions' }
      ]}
    >
      {!canEdit && (
        <div className="lms-alert lms-alert-warning mb-4">
          <strong>Read Only:</strong> Questions cannot be modified. Examination is not in draft status.
        </div>
      )}

      {/* Stats */}
      <div className="lms-stats-row mb-4">
        <div className="lms-stat">
          <div className="lms-stat-value">{questions.length}</div>
          <div className="lms-stat-label">Total Questions</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{questions.reduce((sum, q) => sum + q.marks, 0)}</div>
          <div className="lms-stat-label">Total Marks</div>
        </div>
      </div>

      {/* Add Question Button */}
      {canEdit && !showAddForm && (
        <div className="mb-4">
          <button onClick={() => setShowAddForm(true)} className="lms-btn lms-btn-primary">
            + Add Question
          </button>
        </div>
      )}

      {/* Add Question Form */}
      {showAddForm && canEdit && (
        <div className="lms-section mb-4">
          <div className="lms-section-title">Add New Question</div>
          <div className="lms-info-box">
            <div className="lms-info-box-body">
              {/* Question Type & Marks */}
              <div className="lms-form-row mb-4">
                <div className="lms-form-group">
                  <label className="lms-label">Question Type</label>
                  <select
                    className="lms-select"
                    value={newQuestion.questionType}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, questionType: e.target.value as any }))}
                    title="Question type"
                  >
                    <option value="MCQ">Multiple Choice (Single)</option>
                    <option value="MSQ">Multiple Choice (Multiple)</option>
                    <option value="numerical">Numerical</option>
                    <option value="descriptive">Descriptive</option>
                  </select>
                </div>
                <div className="lms-form-group">
                  <label className="lms-label">Marks</label>
                  <input
                    type="number"
                    className="lms-input w-24"
                    min={1}
                    value={newQuestion.marks}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, marks: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="lms-form-group">
                  <label className="lms-label">Difficulty</label>
                  <select
                    className="lms-select"
                    value={newQuestion.difficulty}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    title="Difficulty level"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div className="lms-form-group mb-4">
                <label className="lms-label">Question Text <span className="lms-required">*</span></label>
                <textarea
                  className="lms-textarea"
                  rows={4}
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, questionText: e.target.value }))}
                  placeholder="Enter the question..."
                />
              </div>

              {/* Options (for MCQ/MSQ) */}
              {['MCQ', 'MSQ'].includes(newQuestion.questionType) && (
                <div className="mb-4">
                  <label className="lms-label mb-2">Options</label>
                  {newQuestion.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center mb-2">
                      <input
                        type={newQuestion.questionType === 'MCQ' ? 'radio' : 'checkbox'}
                        name="correctOption"
                        checked={opt.isCorrect}
                        onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)}
                        title={`Mark option ${idx + 1} as correct`}
                      />
                      <input
                        type="text"
                        className="lms-input flex-1"
                        value={opt.text}
                        onChange={(e) => updateOption(idx, 'text', e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                      />
                      {newQuestion.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="lms-btn lms-btn-sm lms-btn-danger"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {newQuestion.options.length < 8 && (
                    <button type="button" onClick={addOption} className="lms-btn lms-btn-sm">
                      + Add Option
                    </button>
                  )}
                </div>
              )}

              {/* Numerical Answer */}
              {newQuestion.questionType === 'numerical' && (
                <div className="lms-form-group mb-4">
                  <label className="lms-label">Correct Answer <span className="lms-required">*</span></label>
                  <input
                    type="number"
                    className="lms-input w-40"
                    value={newQuestion.correctAnswer}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    placeholder="Enter the correct answer"
                  />
                </div>
              )}

              {/* Explanation */}
              <div className="lms-form-group mb-4">
                <label className="lms-label">Explanation (optional)</label>
                <textarea
                  className="lms-textarea"
                  rows={2}
                  value={newQuestion.explanation}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Explain the correct answer..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={isSubmitting}
                  className="lms-btn lms-btn-primary"
                >
                  {isSubmitting ? 'Adding...' : 'Add Question'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewQuestion({ ...defaultQuestion }); }}
                  className="lms-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="lms-section">
        <div className="lms-section-title">Questions ({questions.length})</div>
        {questions.length === 0 ? (
          <div className="lms-table-empty">No questions yet.</div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Marks</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => (
                  <tr key={q._id || idx}>
                    <td>{idx + 1}</td>
                    <td className="max-w-md">
                      <div className="truncate" title={q.questionText}>
                        {q.questionText.slice(0, 100)}{q.questionText.length > 100 ? '...' : ''}
                      </div>
                    </td>
                    <td>{q.questionType}</td>
                    <td>
                      <span className={`lms-status ${
                        q.difficulty === 'easy' ? 'lms-status-success' :
                        q.difficulty === 'hard' ? 'lms-status-closed' : ''
                      }`}>
                        {q.difficulty?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </td>
                    <td>{q.marks}</td>
                    {canEdit && (
                      <td>
                        <button
                          onClick={() => q._id && handleDeleteQuestion(q._id)}
                          className="lms-btn lms-btn-sm lms-btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex gap-2">
        <Link href={`/teacher/exams/${examId}`} className="lms-btn">
          Back to Exam
        </Link>
        <Link href="/teacher/exams" className="lms-btn">
          All Examinations
        </Link>
      </div>
    </LMSLayout>
  );
}
