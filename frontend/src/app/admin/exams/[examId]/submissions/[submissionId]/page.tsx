'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import PageWrapper from '@/components/layouts/PageWrapper';
import { Button } from '@/components/common';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Flag,
  User,
  Mail,
  Hash,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface SubmissionDetail {
  _id: string;
  exam: {
    _id: string;
    title: string;
    subject: string;
    totalMarks: number;
    passingMarks: number;
    showCorrectAnswers: 'never' | 'immediately' | 'after_close';
    showExplanations: 'never' | 'immediately' | 'after_close';
    showMarks: boolean;
    status: string;
  };
  student: {
    _id: string;
    name: string;
    email: string;
    rollNumber?: string;
  };
  answers: {
    questionId: string;
    question: {
      _id: string;
      questionText: string;
      questionType: 'MCQ' | 'MSQ' | 'numerical' | 'descriptive';
      marks: number;
      options?: { text: string; isCorrect: boolean }[];
      correctAnswer?: number;
      explanation?: string;
      imageUrl?: string;
    };
    selectedOptions?: number[];
    textAnswer?: string;
    isCorrect?: boolean;
    marksObtained: number;
    markedForReview: boolean;
  }[];
  score: number;
  percentage: number;
  status: string;
  startTime: string;
  submitTime?: string;
  timeSpent: number;
  violations: { type: string; timestamp: string; details?: string }[];
  isPassed: boolean;
  attemptNumber: number;
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const examId = params.examId as string;
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const response = await api.get(`/admin/submissions/${submissionId}`);
        setSubmission(response.data.data.submission);
      } catch (error) {
        console.error('Failed to fetch submission:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmission();
  }, [submissionId]);

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={[{ name: 'Loading...' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </PageWrapper>
    );
  }

  if (!submission) {
    return (
      <PageWrapper breadcrumbs={[{ name: 'Submission not found' }]}>
        <div className="text-center py-12">
          <p className="text-gray-500">Submission not found</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      breadcrumbs={[
        { name: 'Site Administration' },
        { name: 'Quiz Administration', href: '/admin/exams' },
        { name: submission.exam.title, href: `/admin/exams/${examId}` },
        { name: 'Results', href: `/admin/exams/${examId}/results` },
        { name: submission.student.name },
      ]}
    >
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/exams/${examId}/results`}
          className="flex items-center gap-1 text-primary-600 hover:underline text-sm mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {submission.exam.title} - Review
            </h1>
            <p className="text-gray-600">Attempt #{submission.attemptNumber}</p>
          </div>
          {submission.isPassed ? (
            <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
              <CheckCircle className="w-5 h-5" />
              Passed
            </span>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium">
              <XCircle className="w-5 h-5" />
              Failed
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Questions */}
        <div className="lg:col-span-2 space-y-4">
          {submission.answers.map((answer, index) => {
            const question = answer.question;
            const isCorrect = answer.isCorrect;

            return (
              <div key={answer.questionId} className="card">
                <div className={`card-header flex items-center justify-between ${
                  isCorrect === true ? 'bg-green-50 border-green-200' :
                  isCorrect === false ? 'bg-red-50 border-red-200' :
                  'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCorrect === true ? 'bg-green-500 text-white' :
                      isCorrect === false ? 'bg-red-500 text-white' :
                      'bg-gray-400 text-white'
                    }`}>
                      {index + 1}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      question.questionType === 'MCQ' ? 'bg-blue-100 text-blue-700' :
                      question.questionType === 'MSQ' ? 'bg-purple-100 text-purple-700' :
                      question.questionType === 'numerical' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {question.questionType.toUpperCase()}
                    </span>
                    {answer.markedForReview && (
                      <Flag className="w-4 h-4 text-purple-500 fill-purple-500" />
                    )}
                  </div>
                  <div className="text-sm font-medium">
                    {answer.marksObtained} / {question.marks} marks
                  </div>
                </div>
                <div className="card-body">
                  {/* Question Text */}
                  <p className="text-gray-800 mb-4">{question.questionText}</p>
                  
                  {/* Question Image */}
                  {question.imageUrl && (
                    <img
                      src={question.imageUrl}
                      alt="Question"
                      className="max-w-md rounded-lg border mb-4"
                    />
                  )}

                  {/* MCQ/MSQ Options */}
                  {(question.questionType === 'MCQ' || question.questionType === 'MSQ') && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => {
                        const isSelected = answer.selectedOptions?.includes(optIndex);
                        const isOptionCorrect = option.isCorrect;

                        let optionClass = 'border-gray-200 bg-white';
                        if (isSelected && isOptionCorrect) {
                          optionClass = 'border-green-500 bg-green-50';
                        } else if (isSelected && !isOptionCorrect) {
                          optionClass = 'border-red-500 bg-red-50';
                        } else if (!isSelected && isOptionCorrect) {
                          optionClass = 'border-green-500 bg-green-50 border-dashed';
                        }

                        return (
                          <div
                            key={optIndex}
                            className={`p-3 border-2 rounded-lg flex items-center gap-3 ${optionClass}`}
                          >
                            <span className="font-semibold text-gray-500">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span className="flex-1">{option.text}</span>
                            {isSelected && (
                              isOptionCorrect ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )
                            )}
                            {!isSelected && isOptionCorrect && (
                              <CheckCircle className="w-5 h-5 text-green-500 opacity-50" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Numerical Answer */}
                  {question.questionType === 'numerical' && (
                    <div className="space-y-2">
                      <div className={`p-3 border-2 rounded-lg ${
                        isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                      }`}>
                        <span className="text-gray-600">Student's answer: </span>
                        <span className="font-semibold">
                          {answer.selectedOptions?.[0] ?? 'Not answered'}
                        </span>
                      </div>
                      <div className="p-3 border-2 border-green-500 bg-green-50 rounded-lg border-dashed">
                        <span className="text-gray-600">Correct answer: </span>
                        <span className="font-semibold text-green-700">
                          {question.correctAnswer}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Descriptive Answer */}
                  {question.questionType === 'descriptive' && (
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-500 mb-1">Student's answer:</p>
                      <p className="whitespace-pre-wrap">
                        {answer.textAnswer || 'Not answered'}
                      </p>
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                      <p className="text-blue-700 text-sm">{question.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Student Info */}
          <div className="card">
            <div className="card-header">
              <h2>Student Information</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span>{submission.student.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{submission.student.email}</span>
              </div>
              {submission.student.rollNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <span>{submission.student.rollNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Score Summary */}
          <div className="card">
            <div className="card-header">
              <h2>Score Summary</h2>
            </div>
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-gray-800">
                  {submission.score}
                  <span className="text-lg text-gray-400">/{submission.exam.totalMarks}</span>
                </div>
                <div className="text-lg text-gray-600">
                  {submission.percentage.toFixed(1)}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className={`h-3 rounded-full ${
                    submission.isPassed ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${submission.percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Passing marks: {submission.exam.passingMarks}
              </p>
            </div>
          </div>

          {/* Time Info */}
          <div className="card">
            <div className="card-header">
              <h2>Attempt Details</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Started</span>
                <span>{format(new Date(submission.startTime), 'MMM d, HH:mm:ss')}</span>
              </div>
              {submission.submitTime && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Submitted</span>
                  <span>{format(new Date(submission.submitTime), 'MMM d, HH:mm:ss')}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Time spent</span>
                <span className="font-medium">{submission.timeSpent} minutes</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  submission.status === 'submitted' ? 'bg-green-100 text-green-700' :
                  submission.status === 'auto_submitted' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {submission.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Violations */}
          {submission.violations.length > 0 && (
            <div className="card border-red-200">
              <div className="card-header bg-red-50">
                <h2 className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Violations ({submission.violations.length})
                </h2>
              </div>
              <div className="card-body max-h-48 overflow-y-auto">
                <ul className="space-y-2 text-sm">
                  {submission.violations.map((violation, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <div>
                        <p className="font-medium text-gray-800">
                          {violation.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(violation.timestamp), 'HH:mm:ss')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
