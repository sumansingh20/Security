'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface Category {
  _id: string;
  name: string;
  subject?: string;
  description?: string;
  questionCount: number;
}

interface Question {
  _id: string;
  questionText: string;
  questionType: string;
  marks: number;
  category?: { _id: string; name: string } | string;
  difficulty: string;
  exam?: { _id: string; title: string };
  createdAt: string;
}

export default function QuestionBankPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const prefix = user?.role === 'teacher' ? '/teacher' : '/admin';
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', subject: '' });
  const [catSaving, setCatSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin' && user?.role !== 'teacher') { router.push('/my'); return; }
    fetchCategories();
    fetchQuestions();
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, typeFilter, difficultyFilter]);

  const fetchCategories = async () => {
    try {
      const response = await api.get(`${prefix}/categories`);
      setCategories(response.data.data?.categories || response.data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all' && selectedCategory !== 'uncategorized') {
        params.set('category', selectedCategory);
      }
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', '200');

      const response = await api.get(`${prefix}/questions?${params.toString()}`);
      const data = response.data.data?.questions || response.data.questions || [];
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) { setError('Category name is required'); return; }
    setCatSaving(true);
    setError('');
    try {
      if (editingCategory) {
        await api.put(`${prefix}/categories/${editingCategory._id}`, categoryForm);
      } else {
        await api.post(`${prefix}/categories`, categoryForm);
      }
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '', subject: '' });
      setEditingCategory(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save category');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`${prefix}/categories/${id}`);
      fetchCategories();
      if (selectedCategory === id) setSelectedCategory('all');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api.delete(`${prefix}/questions/${id}`);
      fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete question');
    }
  };

  const getCategoryName = (q: Question) => {
    if (!q.category) return '—';
    if (typeof q.category === 'object') return q.category.name;
    const cat = categories.find(c => c._id === q.category);
    return cat?.name || '—';
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      'mcq-single': 'MCQ (Single)',
      'mcq-multiple': 'MCQ (Multi)',
      'true-false': 'True/False',
      'fill-blank': 'Fill Blank',
      'short-answer': 'Short Answer',
      'numerical': 'Numerical',
      'long-answer': 'Essay',
      'matching': 'Matching',
      'ordering': 'Ordering',
      'image-based': 'Image',
      'code': 'Code',
    };
    return map[type] || type;
  };

  const getDifficultyColor = (d: string) => {
    if (d === 'easy') return '#22c55e';
    if (d === 'medium') return '#f59e0b';
    if (d === 'hard') return '#ef4444';
    return '#6b7280';
  };

  const basePath = user?.role === 'teacher' ? '/teacher' : '/admin';

  return (
    <LMSLayout pageTitle="Question Bank" breadcrumbs={[{ label: 'Dashboard', href: `${basePath}/dashboard` }, { label: 'Question Bank' }]}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Questions', value: questions.length, color: '#3b82f6' },
          { label: 'Categories', value: categories.length, color: '#8b5cf6' },
          { label: 'MCQ', value: questions.filter(q => q.questionType?.includes('mcq')).length, color: '#22c55e' },
          { label: 'Hard', value: questions.filter(q => q.difficulty === 'hard').length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="lms-card" style={{ padding: '16px', textAlign: 'center', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Categories Sidebar */}
        <div className="lms-card" style={{ width: '240px', flexShrink: 0, padding: '0' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Categories</span>
            <button onClick={() => { setCategoryForm({ name: '', description: '', subject: '' }); setEditingCategory(null); setShowCategoryModal(true); setError(''); }} style={{ fontSize: '13px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
          </div>
          <div style={{ padding: '8px' }}>
            <button onClick={() => setSelectedCategory('all')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: '6px', border: 'none', background: selectedCategory === 'all' ? 'var(--primary-light, #e8f0fe)' : 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: selectedCategory === 'all' ? 600 : 400 }}>
              All Questions
            </button>
            {categories.map(cat => (
              <div key={cat._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderRadius: '6px', background: selectedCategory === cat._id ? 'var(--primary-light, #e8f0fe)' : 'transparent', cursor: 'pointer', fontSize: '13px' }}>
                <button onClick={() => setSelectedCategory(cat._id)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontWeight: selectedCategory === cat._id ? 600 : 400, fontSize: '13px' }}>
                  {cat.name} <span style={{ color: 'var(--text-muted)' }}>({cat.questionCount})</span>
                </button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, description: cat.description || '', subject: cat.subject || '' }); setShowCategoryModal(true); setError(''); }} style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleDeleteCategory(cat._id)} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            ))}
            {categories.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 12px' }}>No categories yet.</p>}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Filters */}
          <div className="lms-card" style={{ padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="Search questions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchQuestions()} className="lms-input" style={{ flex: '1 1 200px' }} />
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="lms-input" title="Filter type" style={{ width: '160px' }}>
                <option value="all">All Types</option>
                <option value="mcq-single">MCQ (Single)</option>
                <option value="mcq-multiple">MCQ (Multi)</option>
                <option value="true-false">True/False</option>
                <option value="fill-blank">Fill Blank</option>
                <option value="short-answer">Short Answer</option>
                <option value="numerical">Numerical</option>
                <option value="long-answer">Essay</option>
                <option value="matching">Matching</option>
                <option value="ordering">Ordering</option>
                <option value="code">Code</option>
              </select>
              <select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)} className="lms-input" title="Filter difficulty" style={{ width: '120px' }}>
                <option value="all">All Levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <Link href={`${basePath}/questions/create`} className="lms-btn lms-btn-primary" style={{ padding: '8px 16px', textDecoration: 'none', whiteSpace: 'nowrap' }}>+ Create Question</Link>
            </div>
          </div>

          {/* Questions */}
          <div className="lms-card" style={{ padding: '0' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <span style={{ fontWeight: 600 }}>Questions ({questions.length})</span>
            </div>
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading questions...</div>
            ) : questions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No questions found.</p>
                <Link href={`${basePath}/questions/create`} className="lms-btn lms-btn-primary" style={{ textDecoration: 'none' }}>Create your first question</Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="lms-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '250px' }}>Question</th>
                      <th>Type</th>
                      <th>Marks</th>
                      <th>Difficulty</th>
                      <th>Category</th>
                      <th>Exam</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map(q => (
                      <tr key={q._id}>
                        <td style={{ maxWidth: '350px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.questionText}</div>
                        </td>
                        <td><span className="lms-badge">{getTypeLabel(q.questionType)}</span></td>
                        <td>{q.marks}</td>
                        <td><span style={{ color: getDifficultyColor(q.difficulty), fontWeight: 500, fontSize: '13px', textTransform: 'capitalize' }}>{q.difficulty}</span></td>
                        <td style={{ fontSize: '13px' }}>{getCategoryName(q)}</td>
                        <td style={{ fontSize: '13px' }}>{q.exam && typeof q.exam === 'object' ? q.exam.title : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <Link href={`${basePath}/questions/${q._id}`} style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}>Edit</Link>
                            <button onClick={() => handleDeleteQuestion(q._id)} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCategoryModal(false)}>
          <div style={{ background: 'var(--bg-primary, #fff)', borderRadius: '12px', maxWidth: '450px', width: '95%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600 }}>{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              {error && <div style={{ marginBottom: '12px', padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', fontSize: '13px' }}>{error}</div>}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Category Name *</label>
                <input type="text" value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Algebra, Mechanics" className="lms-input" style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Subject</label>
                <input type="text" value={categoryForm.subject} onChange={e => setCategoryForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g., Mathematics, Physics" className="lms-input" style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Description</label>
                <textarea value={categoryForm.description} onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" rows={3} className="lms-input" style={{ width: '100%', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="lms-btn lms-btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                <button onClick={handleSaveCategory} disabled={catSaving} className="lms-btn lms-btn-primary" style={{ padding: '8px 16px' }}>{catSaving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
