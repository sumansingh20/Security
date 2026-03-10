'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import toast from 'react-hot-toast';

interface Question {
  _id: string;
  questionText: string;
  questionType: string;
  marks: number;
  options?: { _id?: string; text: string; isCorrect: boolean }[];
  correctOptions?: string[];
  correctAnswer?: string | number;
  explanation?: string;
  imageUrl?: string;
  category?: string;
  section?: string;
}

interface Exam {
  _id: string;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  duration: number;
  startTime: string;
  endTime: string;
  totalMarks: number;
  passingMarks: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showQuestionNumbers: boolean;
  maxAttempts: number;
  allowReview: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  calculatorType: 'none' | 'basic' | 'scientific';
  calculatorEnabled: boolean;
  enableProctoring: boolean;
  detectTabSwitch: boolean;
  detectCopyPaste: boolean;
  maxViolationsBeforeSubmit: number;
  blockRightClick: boolean;
  negativeMarking: boolean;
  negativeMarkValue: number;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
  questions: Question[];
}

const TYPE_LABELS: Record<string, string> = {
  'mcq-single': 'MCQ', 'mcq-multiple': 'MSQ', 'true-false': 'T/F',
  'fill-blank': 'Fill', 'numerical': 'Num', 'short-answer': 'Short',
  'long-answer': 'Essay', 'matching': 'Match', 'ordering': 'Order',
  'image-based': 'Image', 'code': 'Code',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'background: #f3f4f6; color: #374151;',
  published: 'background: #dbeafe; color: #1d4ed8;',
  ongoing: 'background: #dcfce7; color: #16a34a;',
  completed: 'background: #fff7ed; color: #ea580c;',
  archived: 'background: #fef2f2; color: #dc2626;',
};

export default function EditExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true, timing: true, grades: false, questionBehavior: false,
    review: false, calculator: false, antiCheating: false,
  });

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await api.get(`/admin/exams/${examId}`);
        const examData = response.data.data.exam;
        const questionsData = response.data.data.questions || [];
        if (examData.startTime) examData.startTime = new Date(examData.startTime).toISOString().slice(0, 16);
        if (examData.endTime) examData.endTime = new Date(examData.endTime).toISOString().slice(0, 16);
        setExam(examData);
        setQuestions(questionsData);
      } catch {
        toast.error('Failed to load examination');
      } finally {
        setIsLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateExam = <K extends keyof Exam>(key: K, value: Exam[K]) => {
    if (!exam) return;
    setExam({ ...exam, [key]: value });
  };

  const handleSave = async () => {
    if (!exam) return;
    setIsSaving(true);
    try {
      await api.put(`/admin/exams/${examId}`, exam);
      toast.success('Examination settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (questions.length === 0) {
      toast.error('Cannot publish without questions. Add at least one question first.');
      setActiveTab('questions');
      return;
    }
    setIsPublishing(true);
    try {
      await api.post(`/admin/exams/${examId}/publish`);
      if (exam) setExam({ ...exam, status: 'published' });
      toast.success('Examination published. Configuration is now locked.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const refreshData = async () => {
    try {
      const res = await api.get(`/admin/exams/${examId}`);
      const ed = res.data.data.exam;
      const qd = res.data.data.questions || [];
      if (ed.startTime) ed.startTime = new Date(ed.startTime).toISOString().slice(0, 16);
      if (ed.endTime) ed.endTime = new Date(ed.endTime).toISOString().slice(0, 16);
      setExam(ed);
      setQuestions(qd);
    } catch {}
  };

  const SectionHeader = ({ title, section }: { title: string; section: string }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}
    >
      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{title}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>{expandedSections[section] ? '\u25B2' : '\u25BC'}</span>
    </button>
  );

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Loading...">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading examination...</div>
      </LMSLayout>
    );
  }

  if (!exam) {
    return (
      <LMSLayout pageTitle="Not Found">
        <div style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Examination not found.</p>
          <Link href="/admin/exams" className="lms-btn lms-btn-primary">Back to Examinations</Link>
        </div>
      </LMSLayout>
    );
  }

  const isDraft = exam.status === 'draft';

  return (
    <LMSLayout
      pageTitle={exam.title}
      breadcrumbs={[
        { label: 'Admin', href: '/admin/dashboard' },
        { label: 'Examinations', href: '/admin/exams' },
        { label: exam.title },
      ]}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{exam.title}</h1>
            <span style={{ padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, ...Object.fromEntries((STATUS_BADGE[exam.status] || '').split(';').filter(Boolean).map(s => { const [k,v] = s.split(':').map(x => x.trim()); return [k, v]; })) } as any}>
              {(exam.status || '').toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isDraft && (
              <button className="lms-btn lms-btn-success" onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? 'Publishing...' : 'Publish'}
              </button>
            )}
            <Link href={`/admin/exams/${examId}/results`} className="lms-btn" style={{ textDecoration: 'none' }}>
              View Results
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="lms-tabs" style={{ marginBottom: 20 }}>
          <button className={`lms-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            Exam Settings
          </button>
          <button className={`lms-tab ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>
            Questions ({questions.length})
          </button>
        </div>

        {activeTab === 'settings' ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* General */}
            <div className="lms-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader title="General" section="general" />
              {expandedSections.general && (
                <div style={{ padding: 20 }}>
                  <div className="lms-form-group" style={{ marginBottom: 16 }}>
                    <label className="lms-label">Examination Title</label>
                    <input className="lms-input" value={exam.title} onChange={(e) => updateExam('title', e.target.value)} required />
                  </div>
                  <div className="lms-form-group" style={{ marginBottom: 16 }}>
                    <label className="lms-label">Subject</label>
                    <select className="lms-select" value={exam.subject} onChange={(e) => updateExam('subject', e.target.value)} required>
                      <option value="">Select a subject</option>
                      {['Mathematics','Physics','Chemistry','Biology','Computer Science','English','History','Geography','Other'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="lms-form-group" style={{ marginBottom: 16 }}>
                    <label className="lms-label">Description</label>
                    <textarea className="lms-textarea" value={exam.description} onChange={(e) => updateExam('description', e.target.value)} rows={3} />
                  </div>
                  <div className="lms-form-group">
                    <label className="lms-label">Instructions for Students</label>
                    <textarea className="lms-textarea" value={exam.instructions} onChange={(e) => updateExam('instructions', e.target.value)} rows={5} />
                  </div>
                </div>
              )}
            </div>

            {/* Timing */}
            <div className="lms-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader title="Timing" section="timing" />
              {expandedSections.timing && (
                <div style={{ padding: 20 }}>
                  <div className="lms-form-group" style={{ marginBottom: 16 }}>
                    <label className="lms-label">Time Limit (minutes)</label>
                    <input type="number" className="lms-input" style={{ width: 150 }} min={1} value={exam.duration} onChange={(e) => updateExam('duration', parseInt(e.target.value) || 0)} />
                    <div className="lms-form-hint">How long students have once they start</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="lms-form-group">
                      <label className="lms-label">Opens</label>
                      <input type="datetime-local" className="lms-input" value={exam.startTime} onChange={(e) => updateExam('startTime', e.target.value)} />
                    </div>
                    <div className="lms-form-group">
                      <label className="lms-label">Closes</label>
                      <input type="datetime-local" className="lms-input" value={exam.endTime} onChange={(e) => updateExam('endTime', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grade */}
            <div className="lms-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader title="Grade" section="grades" />
              {expandedSections.grades && (
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="lms-form-group">
                      <label className="lms-label">Maximum Grade</label>
                      <input type="number" className="lms-input" min={1} value={exam.totalMarks} onChange={(e) => updateExam('totalMarks', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="lms-form-group">
                      <label className="lms-label">Grade to Pass</label>
                      <input type="number" className="lms-input" min={0} max={exam.totalMarks} value={exam.passingMarks} onChange={(e) => updateExam('passingMarks', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="lms-form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.negativeMarking} onChange={(e) => updateExam('negativeMarking', e.target.checked)} />
                      <span>Enable negative marking</span>
                    </label>
                  </div>
                  {exam.negativeMarking && (
                    <div className="lms-form-group">
                      <label className="lms-label">Negative Mark Value</label>
                      <select className="lms-select" style={{ width: 150 }} value={exam.negativeMarkValue} onChange={(e) => updateExam('negativeMarkValue', parseFloat(e.target.value))}>
                        <option value={0.25}>0.25</option>
                        <option value={0.33}>0.33</option>
                        <option value={0.5}>0.50</option>
                        <option value={1}>1.00</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Question Behaviour */}
            <div className="lms-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader title="Question Behaviour" section="questionBehavior" />
              {expandedSections.questionBehavior && (
                <div style={{ padding: 20 }}>
                  <div className="lms-form-group" style={{ marginBottom: 16 }}>
                    <label className="lms-label">Attempts Allowed</label>
                    <input type="number" className="lms-input" style={{ width: 100 }} min={1} max={5} value={exam.maxAttempts} onChange={(e) => updateExam('maxAttempts', parseInt(e.target.value) || 1)} />
                    <div className="lms-form-hint">Number of attempts a student can take (1-5)</div>
                  </div>
                  <div className="lms-form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.randomizeOptions} onChange={(e) => updateExam('randomizeOptions', e.target.checked)} />
                      <span>Shuffle options within questions</span>
                    </label>
                    <div className="lms-form-hint">Shuffle the order of options in MCQ</div>
                  </div>
                  <div className="lms-form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.randomizeQuestions} onChange={(e) => updateExam('randomizeQuestions', e.target.checked)} />
                      <span>Shuffle questions</span>
                    </label>
                    <div className="lms-form-hint">Shuffle the order of questions</div>
                  </div>
                  <div className="lms-form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.showQuestionNumbers ?? true} onChange={(e) => updateExam('showQuestionNumbers', e.target.checked)} />
                      <span>Show question numbers</span>
                    </label>
                    <div className="lms-form-hint">Display question numbers to students</div>
                  </div>
                </div>
              )}
            </div>

            {/* Review Options */}
            <div className="lms-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader title="Review Options" section="review" />
              {expandedSections.review && (
                <div style={{ padding: 20 }}>
                  <div className="lms-form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.allowReview} onChange={(e) => updateExam('allowReview', e.target.checked)} />
                      <span>Allow review after submission</span>
                    </label>
                  </div>
                  {exam.allowReview && (
                    <>
                      <div className="lms-form-group" style={{ marginBottom: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={exam.showCorrectAnswers} onChange={(e) => updateExam('showCorrectAnswers', e.target.checked)} />
                          <span>Show correct answers during review</span>
                        </label>
                      </div>
                      <div className="lms-form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={exam.showExplanations} onChange={(e) => updateExam('showExplanations', e.target.checked)} />
                          <span>Show answer explanations during review</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Calculator */}
            <div className="lms-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader title="Calculator" section="calculator" />
              {expandedSections.calculator && (
                <div style={{ padding: 20 }}>
                  <div className="lms-form-group">
                    <label className="lms-label">Calculator Type</label>
                    <select className="lms-select" style={{ width: 200 }} value={exam.calculatorType} onChange={(e) => updateExam('calculatorType', e.target.value as any)}>
                      <option value="none">No calculator</option>
                      <option value="basic">Basic calculator</option>
                      <option value="scientific">Scientific calculator</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Anti-Cheating */}
            <div className="lms-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader title="Anti-Cheating / Proctoring" section="antiCheating" />
              {expandedSections.antiCheating && (
                <div style={{ padding: 20 }}>
                  <div className="lms-form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.enableProctoring} onChange={(e) => updateExam('enableProctoring', e.target.checked)} />
                      <span>Enable proctoring (fullscreen mode)</span>
                    </label>
                  </div>
                  <div className="lms-form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.detectTabSwitch} onChange={(e) => updateExam('detectTabSwitch', e.target.checked)} />
                      <span>Detect tab/window switching</span>
                    </label>
                  </div>
                  <div className="lms-form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.detectCopyPaste} onChange={(e) => updateExam('detectCopyPaste', e.target.checked)} />
                      <span>Detect copy/paste</span>
                    </label>
                  </div>
                  <div className="lms-form-group" style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={exam.blockRightClick} onChange={(e) => updateExam('blockRightClick', e.target.checked)} />
                      <span>Block right-click</span>
                    </label>
                  </div>
                  <div className="lms-form-group">
                    <label className="lms-label">Maximum violations before auto-submit</label>
                    <input type="number" className="lms-input" style={{ width: 100 }} min={1} max={20} value={exam.maxViolationsBeforeSubmit} onChange={(e) => updateExam('maxViolationsBeforeSubmit', parseInt(e.target.value) || 5)} />
                  </div>
                </div>
              )}
            </div>

            {/* Save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="submit" className="lms-btn lms-btn-primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          /* Questions Tab */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ color: 'var(--text-muted)' }}>
                {questions.length} question(s) -- Total: {questions.reduce((sum, q) => sum + q.marks, 0)} marks
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href={`/admin/exams/${examId}/questions/add`} className="lms-btn lms-btn-primary" style={{ textDecoration: 'none' }}>
                  Add Question
                </Link>
                <Link href="/admin/questions" className="lms-btn" style={{ textDecoration: 'none' }}>
                  Question Bank
                </Link>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="lms-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>No questions added yet</p>
                <Link href={`/admin/exams/${examId}/questions/add`} style={{ color: 'var(--primary)' }}>
                  Add your first question
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {questions.map((q, idx) => (
                  <div key={q._id} className="lms-card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', minWidth: 24 }}>{idx + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: 'var(--primary-light, #e8f0fe)', color: 'var(--primary)' }}>
                            {TYPE_LABELS[q.questionType] || q.questionType}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.marks} mark(s)</span>
                          {q.category && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280' }}>{q.category}</span>}
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>{q.questionText.slice(0, 120)}{q.questionText.length > 120 ? '...' : ''}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link href={`/admin/exams/${examId}/questions/${q._id}`} className="lms-btn lms-btn-sm" style={{ textDecoration: 'none', padding: '4px 10px' }}>
                          View
                        </Link>
                        <button
                          className="lms-btn lms-btn-sm lms-btn-danger"
                          style={{ padding: '4px 10px' }}
                          onClick={async () => {
                            if (confirm('Delete this question?')) {
                              try {
                                await api.delete(`/admin/questions/${q._id}`);
                                refreshData();
                                toast.success('Question deleted');
                              } catch {
                                toast.error('Failed to delete question');
                              }
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </LMSLayout>
  );
}
