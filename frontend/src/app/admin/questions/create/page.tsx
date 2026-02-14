'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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

interface Question {
  text: string;
  type: 'mcq' | 'truefalse' | 'shortanswer' | 'essay' | 'numerical' | 'matching';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negativeMark: number;
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  explanation: string;
  tags: string[];
}

export default function CreateQuestionPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  
  const [question, setQuestion] = useState<Question>({
    text: '',
    type: 'mcq',
    category: '',
    difficulty: 'medium',
    marks: 1,
    negativeMark: 0,
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
    correctAnswer: '',
    explanation: '',
    tags: [],
  });
  
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push('/my');
      return;
    }
    fetchCategories();
    fetchExams();
  }, [isAuthenticated, user, router]);

  const fetchExams = async () => {
    try {
      const prefix = user?.role === 'teacher' ? '/teacher' : '/admin';
      const response = await api.get(`${prefix}/exams`);
      const list = response.data.data?.exams || response.data.exams || [];
      // Only show draft exams (questions can only be added to draft exams)
      setExams(list.filter((e: ExamOption) => e.status === 'draft'));
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/admin/categories');
      setCategories(response.data.data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuestion({ ...question, [name]: value });
    setError('');
  };

  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const newOptions = [...question.options];
    if (field === 'isCorrect') {
      // For MCQ, only one option can be correct
      if (question.type === 'mcq') {
        newOptions.forEach((opt, i) => {
          opt.isCorrect = i === index;
        });
      } else {
        newOptions[index].isCorrect = value as boolean;
      }
    } else {
      newOptions[index].text = value as string;
    }
    setQuestion({ ...question, options: newOptions });
  };

  const addOption = () => {
    setQuestion({
      ...question,
      options: [...question.options, { text: '', isCorrect: false }],
    });
  };

  const removeOption = (index: number) => {
    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== index);
      setQuestion({ ...question, options: newOptions });
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !question.tags.includes(tagInput.trim())) {
      setQuestion({ ...question, tags: [...question.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setQuestion({ ...question, tags: question.tags.filter((t) => t !== tag) });
  };

  const validateForm = () => {
    if (!question.text.trim()) return 'Question text is required';
    if (!question.category) return 'Category is required';
    if (question.marks < 0) return 'Marks cannot be negative';
    
    if (question.type === 'mcq' || question.type === 'truefalse') {
      const hasCorrectAnswer = question.options.some((opt) => opt.isCorrect);
      if (!hasCorrectAnswer) return 'Please select a correct answer';
      
      const emptyOptions = question.options.filter((opt) => !opt.text.trim());
      if (emptyOptions.length > 0) return 'All options must have text';
    }
    
    if ((question.type === 'shortanswer' || question.type === 'numerical') && !question.correctAnswer.trim()) {
      return 'Correct answer is required';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Filter filled options and get correct option indices
      const filledOptions = question.options.filter(o => o.text.trim());
      const correctOptionIndices = filledOptions
        .map((opt, index) => opt.isCorrect ? index : -1)
        .filter(index => index !== -1);

      // Map question type to backend format
      const typeMap: Record<string, string> = {
        'mcq': 'mcq-single',
        'truefalse': 'true-false',
        'shortanswer': 'mcq-single',
        'numerical': 'mcq-single',
        'essay': 'mcq-single',
        'matching': 'mcq-single',
      };

      const payload = {
        questionText: question.text,
        questionType: typeMap[question.type] || 'mcq-single',
        marks: question.marks,
        negativeMarks: question.negativeMark,
        explanation: question.explanation,
        difficulty: question.difficulty,
        options: filledOptions.map(o => ({ text: o.text })),
        correctOptions: correctOptionIndices,
        tags: question.tags,
        category: question.category,
      };

      if (!selectedExamId) {
        setError('Please select an exam to add this question to.');
        setLoading(false);
        return;
      }

      const prefix = user?.role === 'teacher' ? '/teacher' : '/admin';
      await api.post(`${prefix}/exams/${selectedExamId}/questions`, payload);
      
      toast.success('Question created successfully');
      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/questions');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create question. Please try again.');
      toast.error(err.response?.data?.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!selectedExamId) {
      setError('Please select an exam to add this question to.');
      return;
    }

    setLoading(true);
    try {
      const filledOptions = question.options.filter(o => o.text.trim());
      const correctOptionIndices = question.options
        .map((o, i) => o.isCorrect ? i : -1)
        .filter(i => i >= 0);

      const typeMap: Record<string, string> = {
        'mcq': 'mcq-single',
        'truefalse': 'true-false',
        'shortanswer': 'mcq-single',
        'numerical': 'mcq-single',
        'essay': 'mcq-single',
        'matching': 'mcq-single',
      };

      const payload = {
        questionText: question.text,
        questionType: typeMap[question.type] || 'mcq-single',
        marks: question.marks,
        negativeMarks: question.negativeMark,
        explanation: question.explanation,
        difficulty: question.difficulty,
        options: filledOptions.map(o => ({ text: o.text })),
        correctOptions: correctOptionIndices,
        tags: question.tags,
        category: question.category,
      };

      const prefix = user?.role === 'teacher' ? '/teacher' : '/admin';
      await api.post(`${prefix}/exams/${selectedExamId}/questions`, payload);

      toast.success('Question created! Add another.');
      setQuestion({
        text: '',
        type: question.type,
        category: question.category,
        difficulty: question.difficulty,
        marks: question.marks,
        negativeMark: question.negativeMark,
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
        correctAnswer: '',
        explanation: '',
        tags: [],
      });
      setSuccess(true);
      setError('');
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create question.');
      toast.error(err.response?.data?.message || 'Failed to create question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <Link href="/admin/dashboard" className="text-[#0066cc] hover:underline">Dashboard</Link>
          <span className="mx-2">/</span>
          <Link href="/admin/questions" className="text-[#0066cc] hover:underline">Question Bank</Link>
          <span className="mx-2">/</span>
          <span>Create question</span>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#1d4f91]">Create Question</h1>
          <p className="text-sm text-gray-600 mt-1">
            Add a new question to the question bank
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm">
            Question saved successfully.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Question Details */}
          <div className="bg-white border border-gray-200 mb-4">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-[#1d4f91]">Target Exam</h2>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Exam <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                title="Select exam"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
              >
                <option value="">-- Select an exam (draft only) --</option>
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>{ex.title}</option>
                ))}
              </select>
              {exams.length === 0 && (
                <p className="mt-2 text-sm text-amber-600">No draft exams found. Create an exam first or questions can only be added to exams in &quot;draft&quot; status.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 mb-4">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-[#1d4f91]">Question Details</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={question.type}
                    onChange={handleChange}
                    title="Select question type"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  >
                    <option value="mcq">Multiple Choice (Single Answer)</option>
                    <option value="truefalse">True/False</option>
                    <option value="shortanswer">Short Answer</option>
                    <option value="numerical">Numerical</option>
                    <option value="essay">Essay</option>
                    <option value="matching">Matching</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={question.category}
                    onChange={handleChange}
                    title="Select category"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  >
                    <option value="">Select category</option>
                    <option value="cs-fundamentals">CS Fundamentals</option>
                    <option value="data-structures">Data Structures</option>
                    <option value="algorithms">Algorithms</option>
                    <option value="databases">Databases</option>
                    <option value="networking">Networking</option>
                    <option value="operating-systems">Operating Systems</option>
                    <option value="software-engineering">Software Engineering</option>
                    <option value="mathematics">Mathematics</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    name="difficulty"
                    value={question.difficulty}
                    onChange={handleChange}
                    title="Select difficulty level"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question text <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="text"
                  value={question.text}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  placeholder="Enter your question here..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marks
                  </label>
                  <input
                    type="number"
                    name="marks"
                    value={question.marks}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Negative marking
                  </label>
                  <input
                    type="number"
                    name="negativeMark"
                    value={question.negativeMark}
                    onChange={handleChange}
                    min="0"
                    step="0.25"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  />
                  <p className="text-xs text-gray-500 mt-1">Marks deducted for wrong answer (0 for no negative marking)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Answer Options - For MCQ and True/False */}
          {(question.type === 'mcq' || question.type === 'truefalse') && (
            <div className="bg-white border border-gray-200 mb-4">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-[#1d4f91]">Answer Options</h2>
              </div>
              <div className="p-4 space-y-3">
                {question.type === 'truefalse' ? (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={question.options[0]?.isCorrect}
                        onChange={() => {
                          setQuestion({
                            ...question,
                            options: [
                              { text: 'True', isCorrect: true },
                              { text: 'False', isCorrect: false },
                            ],
                          });
                        }}
                      />
                      <span>True</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={question.options[1]?.isCorrect}
                        onChange={() => {
                          setQuestion({
                            ...question,
                            options: [
                              { text: 'True', isCorrect: false },
                              { text: 'False', isCorrect: true },
                            ],
                          });
                        }}
                      />
                      <span>False</span>
                    </label>
                  </div>
                ) : (
                  <>
                    {question.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={option.isCorrect}
                          onChange={() => handleOptionChange(index, 'isCorrect', true)}
                          title="Mark as correct answer"
                        />
                        <span className="text-sm text-gray-500 w-6">{String.fromCharCode(65 + index)}.</span>
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        {question.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="text-red-500 hover:text-red-700 px-2"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {question.options.length < 6 && (
                      <button
                        type="button"
                        onClick={addOption}
                        className="text-[#0066cc] hover:underline text-sm"
                      >
                        + Add option
                      </button>
                    )}
                  </>
                )}
                <p className="text-xs text-gray-500">Select the radio button next to the correct answer</p>
              </div>
            </div>
          )}

          {/* Correct Answer - For Short Answer and Numerical */}
          {(question.type === 'shortanswer' || question.type === 'numerical') && (
            <div className="bg-white border border-gray-200 mb-4">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-[#1d4f91]">Correct Answer</h2>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {question.type === 'numerical' ? 'Expected numerical answer' : 'Expected answer'} <span className="text-red-500">*</span>
                </label>
                <input
                  type={question.type === 'numerical' ? 'number' : 'text'}
                  name="correctAnswer"
                  value={question.correctAnswer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  placeholder={question.type === 'numerical' ? 'e.g., 42' : 'Enter the expected answer'}
                />
                {question.type === 'shortanswer' && (
                  <p className="text-xs text-gray-500 mt-1">Matching is case-insensitive</p>
                )}
              </div>
            </div>
          )}

          {/* Essay - Grading Notes */}
          {question.type === 'essay' && (
            <div className="bg-white border border-gray-200 mb-4">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-[#1d4f91]">Grading Information</h2>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">
                  Essay questions require manual grading. You can add grading notes below.
                </p>
                <textarea
                  name="explanation"
                  value={question.explanation}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  placeholder="Enter grading guidelines or expected answer points..."
                />
              </div>
            </div>
          )}

          {/* Explanation */}
          {question.type !== 'essay' && (
            <div className="bg-white border border-gray-200 mb-4">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-[#1d4f91]">Explanation (Optional)</h2>
              </div>
              <div className="p-4">
                <textarea
                  name="explanation"
                  value={question.explanation}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  placeholder="Explain why this answer is correct (shown to students after quiz)"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="bg-white border border-gray-200 mb-4">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-[#1d4f91]">Tags</h2>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  placeholder="Add tags to help organize questions"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Add
                </button>
              </div>
              {question.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {question.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Link
              href="/admin/questions"
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSaveAndAddAnother}
              disabled={loading}
              className="px-4 py-2 text-sm border border-[#1d4f91] text-[#1d4f91] hover:bg-gray-50 disabled:opacity-50"
            >
              Save and add another
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-[#1d4f91] text-white hover:bg-[#163d73] disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save question'}
            </button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
