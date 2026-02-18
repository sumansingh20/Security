'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Category {
  _id: string;
  name: string;
  subject: string;
  description?: string;
  questionCount: number;
  parent?: string;
}

interface Question {
  _id: string;
  questionText: string;
  questionType: string;
  marks: number;
  difficulty: string;
  subject: string;
  category?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  isActive: boolean;
  options?: Array<{ text: string; isCorrect: boolean }>;
}

export default function TeacherQuestionBankPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: 'all',
    difficulty: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin' && user?.role !== 'teacher') {
      router.push('/my');
      return;
    }
  }, [isAuthenticated, user, router]);

  const fetchCategories = useCallback(async () => {
    try {
      const [catRes, subRes] = await Promise.all([
        api.get('/teacher/categories'),
        api.get('/teacher/subjects'),
      ]);
      setCategories(catRes.data.data.categories || []);
      setSubjects(subRes.data.data.subjects || []);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, limit: 25 };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedSubject !== 'all') params.subject = selectedSubject;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.difficulty !== 'all') params.difficulty = filters.difficulty;
      if (filters.search) params.search = filters.search;

      let response;
      if (selectedCategory !== 'all') {
        response = await api.get(`/teacher/categories/${selectedCategory}/questions`, { params });
      } else {
        // Use the teacher questions endpoint with filters
        response = await api.get('/teacher/questions', { params });
      }

      setQuestions(response.data.data.questions || []);
      setTotalPages(response.data.data.pagination?.pages || 1);
      setTotalQuestions(response.data.data.pagination?.total || response.data.data.questions?.length || 0);
    } catch (err: any) {
      // If /admin/questions doesn't exist, fall back to category questions
      if (selectedCategory === 'all') {
        setQuestions([]);
        setError('Select a category to view questions');
      } else {
        setError(err.response?.data?.message || 'Failed to load questions');
      }
    } finally {
      setQuestionsLoading(false);
    }
  }, [selectedCategory, selectedSubject, page, filters]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'mcq-single': 'MCQ (Single)',
      'mcq-multiple': 'MCQ (Multiple)',
      'true-false': 'True/False',
      'fill-blank': 'Fill in Blank',
      'numerical': 'Numerical',
      'short-answer': 'Short Answer',
      'long-answer': 'Essay',
      'matching': 'Matching',
      'ordering': 'Ordering',
      'image-based': 'Image Based',
      'audio-based': 'Audio Based',
      'video-based': 'Video Based',
      'code': 'Code',
      'hotspot': 'Hotspot',
    };
    return labels[type] || type;
  };

  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty) {
      case 'hard': return 'lms-status-closed';
      case 'medium': return 'lms-status-info';
      case 'easy': return 'lms-status-success';
      default: return '';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    // Remove HTML tags
    const plain = text.replace(/<[^>]*>/g, '');
    if (plain.length <= maxLength) return plain;
    return plain.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Question Bank" breadcrumbs={[{ label: 'Loading...' }]}>
        <div className="lms-loading">Loading question bank...</div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Question Bank"
      breadcrumbs={[
        { label: 'Teacher Dashboard', href: '/teacher' },
        { label: 'Question Bank' },
      ]}
    >
      {/* Categories Section */}
      <div className="lms-section" style={{ marginBottom: '16px' }}>
        <div className="lms-section-title">Categories</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button
            onClick={() => { setSelectedCategory('all'); setPage(1); }}
            className={`lms-btn lms-btn-sm ${selectedCategory === 'all' ? 'lms-btn-primary' : ''}`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => { setSelectedCategory(cat._id); setPage(1); }}
              className={`lms-btn lms-btn-sm ${selectedCategory === cat._id ? 'lms-btn-primary' : ''}`}
            >
              {cat.name} ({cat.questionCount || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="lms-section" style={{ marginBottom: '16px' }}>
        <div className="lms-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Filters</span>
          <Link href="/teacher/questions/create" className="lms-btn lms-btn-primary" style={{ textDecoration: 'none', fontSize: '13px', padding: '6px 14px' }}>+ Create Question</Link>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={selectedSubject}
            onChange={(e) => { setSelectedSubject(e.target.value); setPage(1); }}
            className="lms-select"
            title="Filter by subject"
          >
            <option value="all">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="lms-select"
            title="Filter by question type"
          >
            <option value="all">All Types</option>
            <option value="mcq-single">MCQ (Single)</option>
            <option value="mcq-multiple">MCQ (Multiple)</option>
            <option value="true-false">True/False</option>
            <option value="fill-blank">Fill in Blank</option>
            <option value="numerical">Numerical</option>
            <option value="short-answer">Short Answer</option>
            <option value="long-answer">Essay</option>
            <option value="matching">Matching</option>
            <option value="ordering">Ordering</option>
            <option value="code">Code</option>
          </select>

          <select
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            className="lms-select"
            title="Filter by difficulty"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <input
            type="text"
            placeholder="Search questions..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="lms-input"
            style={{ minWidth: '200px' }}
          />
        </div>
      </div>

      {/* Questions Table */}
      <div className="lms-section">
        <div className="lms-section-title">
          Questions {totalQuestions > 0 && `(${totalQuestions})`}
        </div>

        {error && (
          <div className="lms-alert lms-alert-info" style={{ marginBottom: '12px' }}>
            {error}
          </div>
        )}

        {questionsLoading ? (
          <div className="lms-loading">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="lms-table-empty">
            {selectedCategory === 'all' 
              ? 'Select a category to view questions, or use filters to search.'
              : 'No questions found in this category.'}
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Question</th>
                  <th>Type</th>
                  <th>Difficulty</th>
                  <th>Marks</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question._id}>
                    <td style={{ maxWidth: '400px' }}>
                      <div style={{ fontSize: '13px' }}>
                        {truncateText(question.questionText, 120)}
                      </div>
                    </td>
                    <td>{getQuestionTypeLabel(question.questionType)}</td>
                    <td>
                      <span className={`lms-status ${getDifficultyClass(question.difficulty)}`}>
                        {question.difficulty?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </td>
                    <td>{question.marks}</td>
                    <td>{question.category?.name || '-'}</td>
                    <td>
                      <span className={`lms-status ${question.isActive ? 'lms-status-success' : 'lms-status-closed'}`}>
                        {question.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/teacher/questions/${question._id}`}
                        className="lms-btn lms-btn-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="lms-pagination" style={{ marginTop: '16px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="lms-btn lms-btn-sm"
            >
              Previous
            </button>
            <span style={{ padding: '0 12px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="lms-btn lms-btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </LMSLayout>
  );
}
