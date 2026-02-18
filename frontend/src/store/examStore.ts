import { create } from 'zustand';
import api from '@/lib/api';
import { socketService } from '@/lib/socket';

// Question states
export type QuestionState = 
  | 'notyetanswered'  // Gray - not yet visited
  | 'notanswered'     // Red border - visited but not answered
  | 'answered'        // Green - answered
  | 'flagged'         // Purple - marked for review (not answered)
  | 'answeredflagged' // Green with purple corner - answered and flagged
  | 'current';        // Blue outline - current question

export interface Question {
  _id: string;
  questionNumber: number;
  questionText: string;
  questionType: 'mcq-single' | 'mcq-multiple' | 'true-false';
  options?: { _id: string; text: string; imageUrl?: string }[];
  imageUrl?: string;
  marks: number;
  negativeMarks: number;
  section?: string;
}

export interface Answer {
  questionId: string;
  selectedOptions?: string[];
  markedForReview: boolean;
  visited: boolean;
  timeTaken?: number;
  savedAt?: Date;
}

export interface QuizAttempt {
  _id: string;
  examId: string;
  examTitle: string;
  startTime: Date;
  endTime: Date;
  timeRemaining: number;
  questions: Question[];
  answers: Map<string, Answer>;
  currentQuestion: number;
  violationCount: number;
  status: 'in-progress' | 'submitted' | 'auto-submitted';
}

interface ExamState {
  // Available exams list
  availableExams: any[];
  examResults: any[];
  isLoadingExams: boolean;
  examError: string | null;
  
  // Current quiz attempt
  currentAttempt: QuizAttempt | null;
  isAttemptLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  
  // Calculator
  isCalculatorOpen: boolean;
  calculatorType: 'none' | 'basic' | 'scientific';
  
  // Violations
  violations: { type: string; timestamp: Date }[];
  showViolationWarning: boolean;
  
  // Actions
  fetchAvailableExams: () => Promise<void>;
  fetchExamResults: () => Promise<void>;
  startAttempt: (examId: string) => Promise<void>;
  loadAttempt: (attemptId: string) => Promise<void>;
  
  // Quiz navigation
  goToQuestion: (questionNumber: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  
  // Answer actions
  saveAnswer: (questionId: string, answer: Partial<Answer>) => Promise<void>;
  toggleFlag: (questionId: string) => void;
  clearResponse: (questionId: string) => void;
  
  // Attempt control
  finishAttempt: () => Promise<any>;
  autoSubmit: (reason: string) => Promise<void>;
  
  // Calculator
  toggleCalculator: () => void;
  
  // Violations
  recordViolation: (type: string) => void;
  dismissViolationWarning: () => void;
  
  // Timer sync
  syncTimer: (timeRemaining: number) => void;
  
  // Utilities
  getQuestionState: (questionId: string) => QuestionState;
  getAttemptSummary: () => { total: number; answered: number; flagged: number; notAnswered: number };
  
  // Reset
  resetAttempt: () => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  availableExams: [],
  examResults: [],
  isLoadingExams: false,
  examError: null,
  
  currentAttempt: null,
  isAttemptLoading: false,
  isSaving: false,
  lastSaved: null,
  
  isCalculatorOpen: false,
  calculatorType: 'none',
  
  violations: [],
  showViolationWarning: false,

  fetchAvailableExams: async () => {
    set({ isLoadingExams: true, examError: null });
    try {
      const response = await api.get('/student/exams');
      const exams = response.data?.data?.exams || response.data?.exams || [];
      set({ availableExams: exams, isLoadingExams: false, examError: null });
    } catch (error: any) {
      console.error('Failed to fetch exams:', error);
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to load exams';
      set({ isLoadingExams: false, examError: msg, availableExams: [] });
    }
  },

  fetchExamResults: async () => {
    try {
      const response = await api.get('/student/results');
      const results = response.data?.data?.results || response.data?.results || [];
      set({ examResults: results });
    } catch (error) {
      console.error('Failed to fetch results:', error);
      set({ examResults: [] });
    }
  },

  startAttempt: async (examId: string) => {
    set({ isAttemptLoading: true });
    try {
      const response = await api.post(`/student/exams/${examId}/start`);
      const d = response.data.data;
      const submission = d.submission;
      const questions = d.questions;
      const state = d.state || {};
      
      // Initialize answers map from state.submissionAnswers or fresh
      const answersMap = new Map<string, Answer>();
      questions.forEach((q: Question) => {
        const existingAnswer = state.submissionAnswers?.find((a: any) => a.questionId === q._id);
        answersMap.set(q._id, {
          questionId: q._id,
          selectedOptions: existingAnswer?.selectedOptions || [],
          markedForReview: existingAnswer?.markedForReview || false,
          visited: existingAnswer?.visited || false,
          savedAt: existingAnswer?.savedAt,
        });
      });
      
      const currentAttempt: QuizAttempt = {
        _id: submission.id || submission._id,
        examId: submission.examId,
        examTitle: d.examTitle || '',
        startTime: new Date(submission.startedAt),
        endTime: new Date(submission.serverEndTime),
        timeRemaining: state.remainingTime ?? submission.remainingTime ?? 0,
        questions,
        answers: answersMap,
        currentQuestion: state.currentQuestion || 0,
        violationCount: submission.totalViolations || 0,
        status: 'in-progress',
      };
      
      // Connect to socket for real-time sync
      socketService.joinExamRoom(submission.id || submission._id);
      
      set({ 
        currentAttempt, 
        isAttemptLoading: false,
        calculatorType: 'none',
        violations: [],
      });
    } catch (error: any) {
      set({ isAttemptLoading: false });
      throw error;
    }
  },

  loadAttempt: async (submissionId: string) => {
    set({ isAttemptLoading: true });
    try {
      const response = await api.get(`/student/submissions/${submissionId}`);
      const d = response.data.data;
      const submission = d.submission;
      const exam = d.exam;
      
      const answersMap = new Map<string, Answer>();
      // loadAttempt gets submission status — no questions in this endpoint
      
      const currentAttempt: QuizAttempt = {
        _id: submission.id || submission._id,
        examId: submission.examId || exam?._id,
        examTitle: exam?.title || '',
        startTime: new Date(submission.startedAt),
        endTime: new Date(submission.serverEndTime),
        timeRemaining: submission.remainingTime || 0,
        questions: [],
        answers: answersMap,
        currentQuestion: 0,
        violationCount: submission.totalViolations || 0,
        status: submission.status,
      };
      
      socketService.joinExamRoom(submission.id || submission._id);
      
      set({ 
        currentAttempt, 
        isAttemptLoading: false,
        calculatorType: 'none',
      });
    } catch (error) {
      set({ isAttemptLoading: false });
      throw error;
    }
  },

  goToQuestion: (questionNumber: number) => {
    const { currentAttempt } = get();
    if (!currentAttempt) return;
    
    const idx = Math.max(0, Math.min(questionNumber, currentAttempt.questions.length - 1));
    const question = currentAttempt.questions[idx];
    
    // Mark as visited
    const answers = new Map(currentAttempt.answers);
    const answer = answers.get(question._id);
    if (answer && !answer.visited) {
      answers.set(question._id, { ...answer, visited: true });
    }
    
    set({
      currentAttempt: {
        ...currentAttempt,
        currentQuestion: idx,
        answers,
      },
    });
  },

  nextQuestion: () => {
    const { currentAttempt, goToQuestion } = get();
    if (currentAttempt && currentAttempt.currentQuestion < currentAttempt.questions.length - 1) {
      goToQuestion(currentAttempt.currentQuestion + 1);
    }
  },

  previousQuestion: () => {
    const { currentAttempt, goToQuestion } = get();
    if (currentAttempt && currentAttempt.currentQuestion > 0) {
      goToQuestion(currentAttempt.currentQuestion - 1);
    }
  },

  saveAnswer: async (questionId: string, answerUpdate: Partial<Answer>) => {
    const { currentAttempt } = get();
    if (!currentAttempt) return;
    
    set({ isSaving: true });
    
    // Optimistic update
    const answers = new Map(currentAttempt.answers);
    const existingAnswer = answers.get(questionId) || {
      questionId,
      selectedOptions: [],
      markedForReview: false,
      visited: true,
    };
    
    answers.set(questionId, {
      ...existingAnswer,
      ...answerUpdate,
      visited: true,
      savedAt: new Date(),
    });
    
    set({
      currentAttempt: {
        ...currentAttempt,
        answers,
      },
    });
    
    try {
      // Save to server — map field names to what backend expects
      const serverPayload: any = { questionId };
      if (answerUpdate.selectedOptions !== undefined) serverPayload.selectedOptions = answerUpdate.selectedOptions;
      if (answerUpdate.markedForReview !== undefined) serverPayload.markedForReview = answerUpdate.markedForReview;
      await api.post(`/student/submissions/${currentAttempt._id}/answer`, serverPayload);
      
      // Also emit via socket for real-time sync
      socketService.saveAnswer(currentAttempt._id, questionId, answerUpdate);
      
      set({ isSaving: false, lastSaved: new Date() });
    } catch (error) {
      console.error('Failed to save answer:', error);
      set({ isSaving: false });
    }
  },

  toggleFlag: (questionId: string) => {
    const { currentAttempt, saveAnswer } = get();
    if (!currentAttempt) return;
    
    const answer = currentAttempt.answers.get(questionId);
    const markedForReview = !answer?.markedForReview;
    
    saveAnswer(questionId, { markedForReview });
  },

  clearResponse: (questionId: string) => {
    const { currentAttempt, saveAnswer } = get();
    if (!currentAttempt) return;
    
    saveAnswer(questionId, {
      selectedOptions: [],
    });
  },

  finishAttempt: async () => {
    const { currentAttempt } = get();
    if (!currentAttempt) return;
    
    try {
      const response = await api.post(`/student/submissions/${currentAttempt._id}/submit`);
      
      socketService.leaveExamRoom(currentAttempt._id);
      
      set({
        currentAttempt: {
          ...currentAttempt,
          status: 'submitted',
        },
      });
      
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  autoSubmit: async (reason: string) => {
    const { currentAttempt } = get();
    if (!currentAttempt) return;
    
    try {
      await api.post(`/student/submissions/${currentAttempt._id}/submit`, { reason, autoSubmit: true });
      
      socketService.leaveExamRoom(currentAttempt._id);
      
      set({
        currentAttempt: {
          ...currentAttempt,
          status: 'auto-submitted',
        },
      });
    } catch (error) {
      console.error('Auto-submit failed:', error);
    }
  },

  toggleCalculator: () => {
    set((state) => ({ isCalculatorOpen: !state.isCalculatorOpen }));
  },

  recordViolation: (type: string) => {
    const { currentAttempt, violations, autoSubmit } = get();
    if (!currentAttempt) return;
    
    const newViolation = { type, timestamp: new Date() };
    const newViolations = [...violations, newViolation];
    const newViolationCount = currentAttempt.violationCount + 1;
    
    // Report to server
    api.post(`/student/submissions/${currentAttempt._id}/violation`, { 
      type, 
      description: `Violation: ${type}`,
    }).catch(console.error);
    
    set({
      violations: newViolations,
      showViolationWarning: true,
      currentAttempt: {
        ...currentAttempt,
        violationCount: newViolationCount,
      },
    });
    
    // Auto-submit after 5 violations (configurable)
    if (newViolationCount >= 5) {
      autoSubmit(`Exceeded violation limit (${newViolationCount} violations)`);
    }
  },

  dismissViolationWarning: () => {
    set({ showViolationWarning: false });
  },

  syncTimer: (timeRemaining: number) => {
    const { currentAttempt } = get();
    if (!currentAttempt) return;
    
    set({
      currentAttempt: {
        ...currentAttempt,
        timeRemaining,
      },
    });
  },

  getQuestionState: (questionId: string): QuestionState => {
    const { currentAttempt } = get();
    if (!currentAttempt) return 'notyetanswered';
    
    const answer = currentAttempt.answers.get(questionId);
    const currentQ = currentAttempt.questions[currentAttempt.currentQuestion];
    
    if (currentQ?._id === questionId) {
      return 'current';
    }
    
    if (!answer || !answer.visited) {
      return 'notyetanswered';
    }
    
    const hasAnswer = 
      (answer.selectedOptions && answer.selectedOptions.length > 0);
    
    if (hasAnswer && answer.markedForReview) {
      return 'answeredflagged';
    }
    
    if (hasAnswer) {
      return 'answered';
    }
    
    if (answer.markedForReview) {
      return 'flagged';
    }
    
    return 'notanswered';
  },

  getAttemptSummary: () => {
    const { currentAttempt } = get();
    if (!currentAttempt) {
      return { total: 0, answered: 0, flagged: 0, notAnswered: 0 };
    }
    
    let answered = 0;
    let flagged = 0;
    let notAnswered = 0;
    
    currentAttempt.questions.forEach((q) => {
      const answer = currentAttempt.answers.get(q._id);
      const hasAnswer = 
        (answer?.selectedOptions && answer.selectedOptions.length > 0);
      
      if (hasAnswer) {
        answered++;
      } else if (answer?.visited) {
        notAnswered++;
      }
      
      if (answer?.markedForReview) {
        flagged++;
      }
    });
    
    return {
      total: currentAttempt.questions.length,
      answered,
      flagged,
      notAnswered,
    };
  },

  resetAttempt: () => {
    set({
      currentAttempt: null,
      isAttemptLoading: false,
      isSaving: false,
      lastSaved: null,
      isCalculatorOpen: false,
      violations: [],
      showViolationWarning: false,
    });
  },
}));
