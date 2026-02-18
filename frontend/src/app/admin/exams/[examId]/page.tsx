'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import PageWrapper from '@/components/layouts/PageWrapper';
import { Button, Input, Select, Textarea, Checkbox, Modal } from '@/components/common';
import {
  Settings,
  Clock,
  Eye,
  Calculator,
  Shield,
  Save,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  BarChart2,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Question {
  _id: string;
  questionText: string;
  questionType: 'MCQ' | 'MSQ' | 'numerical' | 'descriptive';
  marks: number;
  options?: { text: string; isCorrect: boolean }[];
  correctAnswer?: string | number;
  explanation?: string;
  imageUrl?: string;
  category?: string;
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
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: number;
  allowReview: boolean;
  showCorrectAnswers: 'never' | 'immediately' | 'after_close';
  showExplanations: 'never' | 'immediately' | 'after_close';
  showMarks: boolean;
  calculatorType: 'none' | 'basic' | 'scientific';
  requireFullscreen: boolean;
  detectTabSwitch: boolean;
  detectCopyPaste: boolean;
  maxViolations: number;
  blockRightClick: boolean;
  blockKeyboardShortcuts: boolean;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
  questions: Question[];
}

export default function EditExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    timing: true,
    grades: false,
    questionBehavior: false,
    review: false,
    calculator: false,
    antiCheating: false,
  });

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await api.get(`/admin/exams/${examId}`);
        const examData = response.data.data.exam;
        const questionsData = response.data.data.questions || [];
        
        // Format dates for input fields
        if (examData.startTime) {
          examData.startTime = new Date(examData.startTime).toISOString().slice(0, 16);
        }
        if (examData.endTime) {
          examData.endTime = new Date(examData.endTime).toISOString().slice(0, 16);
        }
        
        setExam(examData);
        setQuestions(questionsData);
      } catch (error) {
        console.error('Failed to fetch exam:', error);
        toast.error('Failed to load quiz');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
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
      toast.success('Quiz settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    // Validate questions exist
    if (questions.length === 0) {
      toast.error('Cannot publish quiz without questions. Please add at least one question first.');
      setActiveTab('questions');
      return;
    }

    setIsPublishing(true);
    try {
      await api.post(`/admin/exams/${examId}/publish`);
      if (exam) {
        setExam({ ...exam, status: 'published' });
      }
      toast.success('Quiz published successfully! Configuration is now locked.');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to publish quiz';
      toast.error(errorMsg);
    } finally {
      setIsPublishing(false);
    }
  };

  const SectionHeader = ({
    title,
    section,
    icon: Icon,
  }: {
    title: string;
    section: keyof typeof expandedSections;
    icon: any;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-primary-500" />
        <span className="font-semibold text-gray-800">{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={[{ name: 'Loading...' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </PageWrapper>
    );
  }

  if (!exam) {
    return (
      <PageWrapper breadcrumbs={[{ name: 'Quiz not found' }]}>
        <div className="text-center py-12">
          <p className="text-gray-500">Quiz not found or you don't have permission to edit it.</p>
          <Link href="/admin/exams" className="text-primary-600 hover:underline mt-2 block">
            Back to Quiz Administration
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      breadcrumbs={[
        { name: 'Site Administration' },
        { name: 'Quiz Administration', href: '/admin/exams' },
        { name: exam.title },
      ]}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">{exam.title}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                exam.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                exam.status === 'published' ? 'bg-blue-100 text-blue-700' :
                exam.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                exam.status === 'completed' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
              </span>
            </div>
            <p className="text-gray-600">{exam.subject}</p>
          </div>
          <div className="flex gap-3">
            {exam.status === 'draft' && (
              <Button 
                variant="success" 
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing...' : 'Publish Quiz'}
              </Button>
            )}
            <Link href={`/admin/exams/${examId}/results`}>
              <Button variant="secondary" leftIcon={<BarChart2 className="w-4 h-4" />}>
                View Results
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-primary-500 text-primary-500 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Quiz Settings
              </div>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`pb-3 px-1 border-b-2 transition-colors ${
                activeTab === 'questions'
                  ? 'border-primary-500 text-primary-500 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Questions ({questions.length})
              </div>
            </button>
          </nav>
        </div>

        {activeTab === 'settings' ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* General Section */}
            <div className="card mb-4 overflow-hidden">
              <SectionHeader title="General" section="general" icon={Settings} />
              {expandedSections.general && (
                <div className="p-6 space-y-4">
                  <Input
                    label="Quiz Name"
                    value={exam.title}
                    onChange={(e) => updateExam('title', e.target.value)}
                    required
                  />
                  <Select
                    label="Subject"
                    value={exam.subject}
                    onChange={(e) => updateExam('subject', e.target.value)}
                    required
                  >
                    <option value="">Select a subject</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="English">English</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                    <option value="Other">Other</option>
                  </Select>
                  <Textarea
                    label="Description"
                    value={exam.description}
                    onChange={(e) => updateExam('description', e.target.value)}
                    rows={3}
                  />
                  <Textarea
                    label="Instructions for Students"
                    value={exam.instructions}
                    onChange={(e) => updateExam('instructions', e.target.value)}
                    rows={5}
                  />
                </div>
              )}
            </div>

            {/* Timing Section */}
            <div className="card mb-4 overflow-hidden">
              <SectionHeader title="Timing" section="timing" icon={Clock} />
              {expandedSections.timing && (
                <div className="p-6 space-y-4">
                  <Input
                    label="Time Limit (minutes)"
                    type="number"
                    min={1}
                    value={exam.duration}
                    onChange={(e) => updateExam('duration', parseInt(e.target.value) || 0)}
                    helper="How long students have once they start the quiz"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Quiz Opens"
                      type="datetime-local"
                      value={exam.startTime}
                      onChange={(e) => updateExam('startTime', e.target.value)}
                    />
                    <Input
                      label="Quiz Closes"
                      type="datetime-local"
                      value={exam.endTime}
                      onChange={(e) => updateExam('endTime', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Grade Section */}
            <div className="card mb-4 overflow-hidden">
              <SectionHeader title="Grade" section="grades" icon={Settings} />
              {expandedSections.grades && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Maximum Grade"
                      type="number"
                      min={1}
                      value={exam.totalMarks}
                      onChange={(e) => updateExam('totalMarks', parseInt(e.target.value) || 0)}
                    />
                    <Input
                      label="Grade to Pass"
                      type="number"
                      min={0}
                      max={exam.totalMarks}
                      value={exam.passingMarks}
                      onChange={(e) => updateExam('passingMarks', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Question Behavior Section */}
            <div className="card mb-4 overflow-hidden">
              <SectionHeader title="Question Behaviour" section="questionBehavior" icon={Settings} />
              {expandedSections.questionBehavior && (
                <div className="p-6 space-y-4">
                  <Input
                    label="Attempts Allowed"
                    type="number"
                    min={1}
                    value={exam.maxAttempts}
                    onChange={(e) => updateExam('maxAttempts', parseInt(e.target.value) || 1)}
                  />
                  <Checkbox
                    label="Shuffle within questions"
                    checked={exam.shuffleOptions}
                    onChange={(e) => updateExam('shuffleOptions', e.target.checked)}
                    description="Shuffle the order of options"
                  />
                  <Checkbox
                    label="Shuffle questions"
                    checked={exam.shuffleQuestions}
                    onChange={(e) => updateExam('shuffleQuestions', e.target.checked)}
                    description="Shuffle the order of questions"
                  />
                </div>
              )}
            </div>

            {/* Review Options Section */}
            <div className="card mb-4 overflow-hidden">
              <SectionHeader title="Review Options" section="review" icon={Eye} />
              {expandedSections.review && (
                <div className="p-6 space-y-4">
                  <Checkbox
                    label="Allow review"
                    checked={exam.allowReview}
                    onChange={(e) => updateExam('allowReview', e.target.checked)}
                  />
                  {exam.allowReview && (
                    <>
                      <Select
                        label="Show correct answers"
                        value={exam.showCorrectAnswers}
                        onChange={(e) => updateExam('showCorrectAnswers', e.target.value as any)}
                      >
                        <option value="never">Never</option>
                        <option value="immediately">Immediately after the attempt</option>
                        <option value="after_close">After the quiz is closed</option>
                      </Select>
                      <Select
                        label="Show explanations"
                        value={exam.showExplanations}
                        onChange={(e) => updateExam('showExplanations', e.target.value as any)}
                      >
                        <option value="never">Never</option>
                        <option value="immediately">Immediately after the attempt</option>
                        <option value="after_close">After the quiz is closed</option>
                      </Select>
                      <Checkbox
                        label="Show marks"
                        checked={exam.showMarks}
                        onChange={(e) => updateExam('showMarks', e.target.checked)}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Calculator Section */}
            <div className="card mb-4 overflow-hidden">
              <SectionHeader title="Calculator" section="calculator" icon={Calculator} />
              {expandedSections.calculator && (
                <div className="p-6 space-y-4">
                  <Select
                    label="Calculator Type"
                    value={exam.calculatorType}
                    onChange={(e) => updateExam('calculatorType', e.target.value as any)}
                  >
                    <option value="none">No calculator</option>
                    <option value="basic">Basic calculator</option>
                    <option value="scientific">Scientific calculator</option>
                  </Select>
                </div>
              )}
            </div>

            {/* Anti-Cheating Section */}
            <div className="card mb-4 overflow-hidden">
              <SectionHeader title="Anti-Cheating / Proctoring" section="antiCheating" icon={Shield} />
              {expandedSections.antiCheating && (
                <div className="p-6 space-y-4">
                  <Checkbox
                    label="Require fullscreen mode"
                    checked={exam.requireFullscreen}
                    onChange={(e) => updateExam('requireFullscreen', e.target.checked)}
                  />
                  <Checkbox
                    label="Detect tab/window switching"
                    checked={exam.detectTabSwitch}
                    onChange={(e) => updateExam('detectTabSwitch', e.target.checked)}
                  />
                  <Checkbox
                    label="Detect copy/paste"
                    checked={exam.detectCopyPaste}
                    onChange={(e) => updateExam('detectCopyPaste', e.target.checked)}
                  />
                  <Checkbox
                    label="Block right-click"
                    checked={exam.blockRightClick}
                    onChange={(e) => updateExam('blockRightClick', e.target.checked)}
                  />
                  <Checkbox
                    label="Block keyboard shortcuts"
                    checked={exam.blockKeyboardShortcuts}
                    onChange={(e) => updateExam('blockKeyboardShortcuts', e.target.checked)}
                  />
                  <Input
                    label="Maximum violations"
                    type="number"
                    min={1}
                    max={20}
                    value={exam.maxViolations}
                    onChange={(e) => updateExam('maxViolations', parseInt(e.target.value) || 5)}
                  />
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="submit"
                disabled={isSaving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <QuestionsList examId={examId} questions={questions} onUpdate={() => {
            // Refresh exam data
            api.get(`/admin/exams/${examId}`).then(res => {
              const examData = res.data.data.exam;
              const questionsData = res.data.data.questions || [];
              if (examData.startTime) {
                examData.startTime = new Date(examData.startTime).toISOString().slice(0, 16);
              }
              if (examData.endTime) {
                examData.endTime = new Date(examData.endTime).toISOString().slice(0, 16);
              }
              setExam(examData);
              setQuestions(questionsData);
            });
          }} />
        )}
      </div>
    </PageWrapper>
  );
}

// Questions List Component
function QuestionsList({
  examId,
  questions,
  onUpdate,
}: {
  examId: string;
  questions: Question[];
  onUpdate: () => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600">
          {questions.length} question(s) • Total: {questions.reduce((sum, q) => sum + q.marks, 0)} marks
        </p>
        <div className="flex gap-2">
          <Link href={`/admin/exams/${examId}/questions/add`}>
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Add Question
            </Button>
          </Link>
          <Link href={`/admin/questions`}>
            <Button variant="secondary">
              Question Bank
            </Button>
          </Link>
        </div>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No questions added yet</p>
            <Link href={`/admin/exams/${examId}/questions/add`} className="text-primary-600 hover:underline">
              Add your first question
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={question._id} className="card">
              <div className="card-body flex items-start gap-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <GripVertical className="w-5 h-5 cursor-move" />
                  <span className="font-medium w-6">{index + 1}.</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      question.questionType === 'MCQ' ? 'bg-blue-100 text-blue-700' :
                      question.questionType === 'MSQ' ? 'bg-purple-100 text-purple-700' :
                      question.questionType === 'numerical' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {question.questionType.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">{question.marks} mark(s)</span>
                    {question.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {question.category}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 line-clamp-2">{question.questionText}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/exams/${examId}/questions/${question._id}`}>
                    <button className="p-2 hover:bg-gray-100 rounded" title="Edit">
                      <Settings className="w-4 h-4 text-gray-500" />
                    </button>
                  </Link>
                  <button
                    className="p-2 hover:bg-red-50 rounded"
                    title="Delete"
                    onClick={async () => {
                      if (confirm('Delete this question?')) {
                        try {
                          await api.delete(`/admin/questions/${question._id}`);
                          onUpdate();
                          toast.success('Question deleted');
                        } catch (error) {
                          toast.error('Failed to delete question');
                        }
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
