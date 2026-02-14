'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import LMSLayout from '@/components/layouts/LMSLayout';

interface Category {
  _id: string;
  name: string;
  description?: string;
  questionCount: number;
  parent?: string;
}

interface Question {
  _id: string;
  questionText: string;
  questionType: 'MCQ' | 'MSQ' | 'numerical' | 'descriptive';
  marks: number;
  category?: string;
  categoryName?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  usedInExams: number;
  createdAt: string;
}

export default function QuestionBankPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchCategories();
    fetchQuestions();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, typeFilter, difficultyFilter]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/admin/categories');
      setCategories(response.data.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      // Get questions from the category endpoint or all questions
      if (selectedCategory !== 'all') {
        const response = await api.get(`/admin/categories/${selectedCategory}/questions`);
        setQuestions(response.data.data.questions || []);
      } else {
        // Fetch all questions across all categories
        const catResponse = await api.get('/admin/categories');
        const cats = catResponse.data.data.categories || [];
        const allQuestions: Question[] = [];
        
        for (const cat of cats) {
          try {
            const qResponse = await api.get(`/admin/categories/${cat._id}/questions`);
            const qs = qResponse.data.data.questions || [];
            allQuestions.push(...qs.map((q: any) => ({ ...q, categoryName: cat.name })));
          } catch (e) {
            // Skip categories with no questions
          }
        }
        setQuestions(allQuestions);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory._id}`, categoryForm);
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', categoryForm);
        toast.success('Category created');
      }
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category? Questions will be uncategorized.')) return;
    
    try {
      await api.delete(`/admin/categories/${categoryId}`);
      toast.success('Category deleted');
      fetchCategories();
      if (selectedCategory === categoryId) {
        setSelectedCategory('all');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    
    try {
      await api.delete(`/admin/questions/${questionId}`);
      toast.success('Question deleted');
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete question');
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.questionText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MCQ': return '🔘';
      case 'MSQ': return '☑️';
      case 'numerical': return '🔢';
      case 'descriptive': return '📝';
      default: return '❓';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '⚪';
    }
  };

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Question Bank">
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading question bank...</span>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Question Bank"
      breadcrumbs={[{ label: 'Administration' }, { label: 'Assessments' }, { label: 'Question Bank' }]}
    >
      {/* Stats */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="lms-stat-icon">📚</div>
          <div className="lms-stat-value">{questions.length}</div>
          <div className="lms-stat-label">Total Questions</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">📁</div>
          <div className="lms-stat-value">{categories.length}</div>
          <div className="lms-stat-label">Categories</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon">🔘</div>
          <div className="lms-stat-value">{questions.filter(q => q.questionType === 'MCQ').length}</div>
          <div className="lms-stat-label">MCQ Questions</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-violation animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">🔴</div>
          <div className="lms-stat-value">{questions.filter(q => q.difficulty === 'hard').length}</div>
          <div className="lms-stat-label">Hard Questions</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Categories Sidebar */}
        <div className="lms-section animate-fadeInLeft" style={{ width: '240px', flexShrink: 0 }}>
          <div className="lms-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><span className="section-icon">📁</span> Categories</span>
            <button
              onClick={() => {
                setCategoryForm({ name: '', description: '' });
                setEditingCategory(null);
                setShowCategoryModal(true);
              }}
              className="lms-btn lms-btn-sm"
            >
              + Add
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`text-left px-3 py-2 rounded text-sm transition-all ${
                selectedCategory === 'all' ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
              }`}
            >
              📊 All Questions ({questions.length})
            </button>
            
            <button
              onClick={() => setSelectedCategory('uncategorized')}
              className={`text-left px-3 py-2 rounded text-sm transition-all ${
                selectedCategory === 'uncategorized' ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
              }`}
            >
              📋 Uncategorized
            </button>

            <hr className="my-2" />

            {categories.map((category) => (
              <div
                key={category._id}
                className={`group flex items-center justify-between px-3 py-2 rounded text-sm transition-all ${
                  selectedCategory === category._id ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => setSelectedCategory(category._id)}
                  className="flex-1 text-left"
                >
                  📂 {category.name} ({category.questionCount})
                </button>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryForm({ name: category.name, description: category.description || '' });
                      setShowCategoryModal(true);
                    }}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category._id)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Filters */}
          <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            <div className="lms-section-title"><span className="section-icon">🔍</span> Search & Filter</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="lms-form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                <label className="lms-label">Search</label>
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="lms-input"
                />
              </div>
              <div className="lms-form-group" style={{ margin: 0, minWidth: '130px' }}>
                <label className="lms-label">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="lms-select"
                  title="Filter by question type"
                >
                  <option value="all">All Types</option>
                  <option value="MCQ">🔘 MCQ</option>
                  <option value="MSQ">☑️ MSQ</option>
                  <option value="numerical">🔢 Numerical</option>
                  <option value="descriptive">📝 Descriptive</option>
                </select>
              </div>
              <div className="lms-form-group" style={{ margin: 0, minWidth: '130px' }}>
                <label className="lms-label">Difficulty</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="lms-select"
                  title="Filter by difficulty"
                >
                  <option value="all">All Levels</option>
                  <option value="easy">🟢 Easy</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="hard">🔴 Hard</option>
                </select>
              </div>
              <Link href="/admin/questions/create" className="lms-btn btn-pulse">
                ➕ Create Question
              </Link>
            </div>
          </div>

          {/* Questions Table */}
          <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="lms-section-title"><span className="section-icon">📋</span> Questions ({filteredQuestions.length})</div>
            
            {filteredQuestions.length === 0 ? (
              <div className="lms-table-empty empty-state-animated">
                <div className="empty-icon">📝</div>
                <div>No questions found.</div>
                <Link href="/admin/questions/create" className="lms-btn lms-btn-sm" style={{ marginTop: '12px' }}>
                  Create your first question
                </Link>
              </div>
            ) : (
              <div className="lms-table-container">
                <table className="lms-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Marks</th>
                      <th>Difficulty</th>
                      <th>Category</th>
                      <th>Used In</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((question, idx) => (
                      <tr key={question._id} className="animate-fadeIn" style={{ animationDelay: `${0.03 * idx}s` }}>
                        <td>
                          <div style={{ maxWidth: '350px' }} className="line-clamp-2">{question.questionText}</div>
                        </td>
                        <td>
                          <span className={`lms-badge ${
                            question.questionType === 'MCQ' ? 'lms-badge-info' :
                            question.questionType === 'MSQ' ? 'lms-badge-purple' :
                            'lms-badge-default'
                          }`}>
                            {getTypeIcon(question.questionType)} {question.questionType}
                          </span>
                        </td>
                        <td><span className="lms-badge">{question.marks} pts</span></td>
                        <td>
                          <span className={`lms-status ${
                            question.difficulty === 'easy' ? 'lms-status-active' :
                            question.difficulty === 'medium' ? 'lms-status-pending' :
                            'lms-status-closed'
                          }`}>
                            {getDifficultyIcon(question.difficulty)} {question.difficulty}
                          </span>
                        </td>
                        <td>{question.categoryName || <span className="text-muted">-</span>}</td>
                        <td><span className="lms-badge">{question.usedInExams} exams</span></td>
                        <td>
                          <div className="flex gap-2">
                            <Link href={`/admin/questions/${question._id}`} className="lms-btn lms-btn-sm">
                              ✏️ Edit
                            </Link>
                            <button
                              onClick={() => handleDeleteQuestion(question._id)}
                              className="lms-btn lms-btn-sm"
                              style={{ background: '#ef4444', color: '#fff' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.3s', marginTop: '20px' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📖</span> Question Bank Guidelines
        </div>
        <div className="lms-info-box-body text-xs">
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">●</span><strong>MCQ:</strong> Multiple Choice - Single correct answer</li>
            <li className="guideline-item"><span className="guideline-icon submit">●</span><strong>MSQ:</strong> Multiple Select - Multiple correct answers</li>
            <li className="guideline-item"><span className="guideline-icon idle">●</span><strong>Numerical:</strong> Exact number or range answer</li>
            <li className="guideline-item"><span className="guideline-icon violation">●</span><strong>Descriptive:</strong> Free text response</li>
          </ul>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="lms-modal-overlay animate-fadeIn" onClick={() => setShowCategoryModal(false)}>
          <div className="lms-modal animate-scaleIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '95%' }}>
            <div className="lms-modal-header">
              <h3><span className="section-icon">📁</span> {editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button className="lms-modal-close" onClick={() => setShowCategoryModal(false)}>×</button>
            </div>
            <div className="lms-modal-body">
              <div className="lms-form-group">
                <label className="lms-label">Category Name <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Algebra, Mechanics"
                  className="lms-input"
                />
              </div>
              <div className="lms-form-group">
                <label className="lms-label">Description (optional)</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief description of this category"
                  rows={3}
                  className="lms-input"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: '', description: '' }); }} className="lms-btn lms-btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveCategory} className="lms-btn">
                  {editingCategory ? '✅ Update' : '➕ Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
