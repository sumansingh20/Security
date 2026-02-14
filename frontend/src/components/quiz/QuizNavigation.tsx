'use client';

import { QuestionState, Question, Answer } from '@/store/examStore';
import clsx from 'clsx';
import { Flag, Check, Circle, AlertCircle, Eye } from 'lucide-react';

interface QuizNavigationProps {
  questions: Question[];
  answers: Map<string, Answer>;
  currentIndex: number;
  onNavigate: (index: number) => void;
  getQuestionState: (questionId: string) => QuestionState;
}

export default function QuizNavigation({
  questions,
  answers,
  currentIndex,
  onNavigate,
  getQuestionState,
}: QuizNavigationProps) {
  // Calculate summary
  const summary = {
    total: questions.length,
    answered: 0,
    notAnswered: 0,
    flagged: 0,
    notSeen: 0,
  };

  questions.forEach((q) => {
    const answer = answers.get(q._id);
    const hasAnswer =
      (answer?.selectedOptions && answer.selectedOptions.length > 0);

    if (hasAnswer) {
      summary.answered++;
    } else if (answer?.visited) {
      summary.notAnswered++;
    } else {
      summary.notSeen++;
    }

    if (answer?.markedForReview) {
      summary.flagged++;
    }
  });

  const getStateStyles = (state: QuestionState, isCurrent: boolean) => {
    const baseStyles = 'quiz-nav-item relative w-10 h-10 rounded-lg font-medium text-sm flex items-center justify-center transition-all duration-200';
    
    // Premium accessible color palette
    switch (state) {
      case 'answered':
        return clsx(
          baseStyles,
          'bg-emerald-500 border-2 border-emerald-500 text-white shadow-sm',
          isCurrent && 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900'
        );
      case 'answeredflagged':
        return clsx(
          baseStyles,
          'bg-emerald-500 border-2 border-violet-500 text-white shadow-sm',
          isCurrent && 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900'
        );
      case 'flagged':
        return clsx(
          baseStyles,
          'bg-violet-500 border-2 border-violet-500 text-white shadow-sm',
          isCurrent && 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900'
        );
      case 'notanswered':
        return clsx(
          baseStyles,
          'bg-white dark:bg-gray-800 border-2 border-amber-500 text-amber-600 dark:text-amber-400',
          isCurrent && 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900'
        );
      case 'notyetanswered':
      default:
        return clsx(
          baseStyles,
          'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
          'hover:border-gray-300 dark:hover:border-gray-600',
          isCurrent && 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-900'
        );
    }
  };

  return (
    <div className="p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Question Navigator</h3>

      {/* Question Grid - Premium Clean Design */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {questions.map((question, idx) => {
          const state = getQuestionState(question._id);
          const isCurrent = idx === currentIndex;
          const answer = answers.get(question._id);

          return (
            <button
              key={question._id}
              onClick={() => onNavigate(idx)}
              className={getStateStyles(state, isCurrent)}
              title={`Question ${idx + 1}`}
              aria-current={isCurrent ? 'true' : undefined}
            >
              {idx + 1}
              {answer?.markedForReview && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center shadow-sm">
                  <Flag className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend - Clean Premium Design */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Status Legend</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center">
              <Circle className="w-3 h-3 text-gray-400" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Not visited</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white dark:bg-gray-800 border-2 border-amber-500 rounded-lg flex items-center justify-center">
              <Eye className="w-3 h-3 text-amber-500" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Visited, not answered</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 border-2 border-emerald-500 rounded-lg flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Answered</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-500 border-2 border-violet-500 rounded-lg flex items-center justify-center">
              <Flag className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Flagged for review</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 border-2 border-violet-500 rounded-lg flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Answered & flagged</span>
          </div>
        </div>
      </div>

      {/* Summary - Premium Stats Card */}
      <div className="border-t border-gray-100 dark:border-gray-800 mt-5 pt-5">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Progress Summary</h4>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Answered</span>
            </div>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{summary.answered}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Not answered</span>
            </div>
            <span className="font-semibold text-amber-600 dark:text-amber-400">{summary.notAnswered}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Not visited</span>
            </div>
            <span className="font-semibold text-gray-600 dark:text-gray-400">{summary.notSeen}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Flag className="w-3 h-3 text-violet-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Flagged</span>
            </div>
            <span className="font-semibold text-violet-600 dark:text-violet-400">{summary.flagged}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>Progress</span>
            <span>{Math.round((summary.answered / summary.total) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(summary.answered / summary.total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
