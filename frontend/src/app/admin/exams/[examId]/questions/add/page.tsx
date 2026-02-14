'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageWrapper from '@/components/layouts/PageWrapper';
import { Button, Input, Select, Textarea, Checkbox } from '@/components/common';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Option {
  text: string;
  isCorrect: boolean;
}

interface QuestionForm {
  questionText: string;
  questionType: 'MCQ' | 'MSQ' | 'numerical' | 'descriptive';
  marks: number;
  options: Option[];
  correctAnswer: string;
  explanation: string;
  imageUrl: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const defaultForm: QuestionForm = {
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
  imageUrl: '',
  category: '',
  difficulty: 'medium',
};

export default function AddQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [form, setForm] = useState<QuestionForm>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addAnother, setAddAnother] = useState(true);

  const updateForm = <K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateOption = (index: number, field: keyof Option, value: string | boolean) => {
    const newOptions = [...form.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // For MCQ, ensure only one option is correct
    if (field === 'isCorrect' && value === true && form.questionType === 'MCQ') {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.isCorrect = false;
      });
    }
    
    updateForm('options', newOptions);
  };

  const addOption = () => {
    if (form.options.length >= 8) {
      toast.error('Maximum 8 options allowed');
      return;
    }
    updateForm('options', [...form.options, { text: '', isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (form.options.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    updateForm('options', form.options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.questionText.trim()) {
      toast.error('Please enter the question text');
      return;
    }

    if (form.questionType === 'MCQ' || form.questionType === 'MSQ') {
      const filledOptions = form.options.filter(o => o.text.trim());
      if (filledOptions.length < 2) {
        toast.error('Please enter at least 2 options');
        return;
      }
      
      const hasCorrect = form.options.some(o => o.isCorrect);
      if (!hasCorrect) {
        toast.error('Please mark at least one correct answer');
        return;
      }
    }

    if (form.questionType === 'numerical' && !form.correctAnswer) {
      toast.error('Please enter the correct answer');
      return;
    }

    setIsSubmitting(true);
    try {
      // Filter to only filled options
      const filledOptions = form.options.filter(o => o.text.trim());
      
      // Get indices of correct options
      const correctOptionIndices = filledOptions
        .map((opt, index) => opt.isCorrect ? index : -1)
        .filter(index => index !== -1);
      
      // Map frontend questionType to backend format
      const questionTypeMap: Record<string, string> = {
        'MCQ': 'mcq-single',
        'MSQ': 'mcq-multiple',
        'numerical': 'mcq-single', // Will handle differently
        'descriptive': 'mcq-single', // Will handle differently
      };
      
      const payload = {
        questionText: form.questionText,
        questionType: questionTypeMap[form.questionType] || 'mcq-single',
        marks: form.marks,
        explanation: form.explanation,
        difficulty: form.difficulty,
        options: filledOptions.map(o => ({ text: o.text })),
        correctOptions: correctOptionIndices,
      };

      await api.post(`/admin/exams/${examId}/questions`, payload);
      toast.success('Question added successfully');

      if (addAnother) {
        setForm({ ...defaultForm });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        router.push(`/admin/exams/${examId}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper
      breadcrumbs={[
        { name: 'Site Administration' },
        { name: 'Quiz Administration', href: '/admin/exams' },
        { name: 'Edit Quiz', href: `/admin/exams/${examId}` },
        { name: 'Add Question' },
      ]}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.push(`/admin/exams/${examId}`)}
              className="flex items-center gap-1 text-primary-600 hover:underline text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Quiz
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Add New Question</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Question Type & Marks */}
          <div className="card mb-4">
            <div className="card-header">
              <h2>Question Type</h2>
            </div>
            <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Question Type"
                value={form.questionType}
                onChange={(e) => updateForm('questionType', e.target.value as any)}
              >
                <option value="MCQ">Multiple Choice (Single Answer)</option>
                <option value="MSQ">Multiple Choice (Multiple Answers)</option>
                <option value="numerical">Numerical</option>
                <option value="descriptive">Descriptive / Essay</option>
              </Select>
              <Input
                label="Marks"
                type="number"
                min={1}
                value={form.marks}
                onChange={(e) => updateForm('marks', parseInt(e.target.value) || 1)}
              />
              <Select
                label="Difficulty"
                value={form.difficulty}
                onChange={(e) => updateForm('difficulty', e.target.value as any)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </div>
          </div>

          {/* Question Text */}
          <div className="card mb-4">
            <div className="card-header">
              <h2>Question Text</h2>
            </div>
            <div className="card-body space-y-4">
              <Textarea
                value={form.questionText}
                onChange={(e) => updateForm('questionText', e.target.value)}
                placeholder="Enter your question here..."
                rows={4}
                required
              />
              <div className="flex items-center gap-4">
                <Input
                  label="Image URL (optional)"
                  value={form.imageUrl}
                  onChange={(e) => updateForm('imageUrl', e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="flex-1"
                />
                {form.imageUrl && (
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <Input
                label="Category (optional)"
                value={form.category}
                onChange={(e) => updateForm('category', e.target.value)}
                placeholder="e.g., Algebra, Mechanics, Grammar"
              />
            </div>
          </div>

          {/* Options (for MCQ/MSQ) */}
          {(form.questionType === 'MCQ' || form.questionType === 'MSQ') && (
            <div className="card mb-4">
              <div className="card-header flex items-center justify-between">
                <h2>Answer Options</h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addOption}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Option
                </Button>
              </div>
              <div className="card-body space-y-3">
                <p className="text-sm text-gray-500 mb-2">
                  {form.questionType === 'MCQ' 
                    ? 'Select the single correct answer' 
                    : 'Select all correct answers'}
                </p>
                {form.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex items-center">
                      {form.questionType === 'MCQ' ? (
                        <input
                          type="radio"
                          name="correctOption"
                          checked={option.isCorrect}
                          onChange={() => updateOption(index, 'isCorrect', true)}
                          className="w-4 h-4 text-green-500 border-gray-300 focus:ring-green-500"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) => updateOption(index, 'isCorrect', e.target.checked)}
                          className="w-4 h-4 text-green-500 border-gray-300 rounded focus:ring-green-500"
                        />
                      )}
                    </div>
                    <span className="text-gray-500 font-medium w-6">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="flex-1"
                    />
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Numerical Answer */}
          {form.questionType === 'numerical' && (
            <div className="card mb-4">
              <div className="card-header">
                <h2>Correct Answer</h2>
              </div>
              <div className="card-body">
                <Input
                  label="Correct Numerical Value"
                  type="number"
                  step="any"
                  value={form.correctAnswer}
                  onChange={(e) => updateForm('correctAnswer', e.target.value)}
                  placeholder="Enter the correct numerical answer"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Students must enter this exact value (or within tolerance if configured)
                </p>
              </div>
            </div>
          )}

          {/* Descriptive Note */}
          {form.questionType === 'descriptive' && (
            <div className="card mb-4">
              <div className="card-body">
                <div className="alert alert-info">
                  <span>
                    Descriptive questions require manual grading. Students will enter their answers in a text box.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="card mb-4">
            <div className="card-header">
              <h2>Explanation (Optional)</h2>
            </div>
            <div className="card-body">
              <Textarea
                value={form.explanation}
                onChange={(e) => updateForm('explanation', e.target.value)}
                placeholder="Explain why the correct answer is correct. This will be shown to students during review if enabled."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6">
            <Checkbox
              label="Add another question"
              checked={addAnother}
              onChange={(e) => setAddAnother(e.target.checked)}
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/admin/exams/${examId}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isSubmitting ? 'Saving...' : 'Save Question'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
