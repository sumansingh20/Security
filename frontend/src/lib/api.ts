import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // CRITICAL: Include cookies with every request
  withCredentials: true,
});

// Request interceptor - add Bearer token as fallback when cookies fail
api.interceptors.request.use(
  (config) => {
    // Try to get token from sessionStorage (fallback for cross-domain cookie issues)
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('auth_token');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - retry on network errors and 5xx, handle 401 gracefully
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // Retry logic: up to 2 retries for 5xx or network errors (not for 4xx)
    if (config && !config.__retryCount) config.__retryCount = 0;
    const status = error.response?.status;
    const isRetryable = !status || (status >= 500 && status < 600);
    if (config && isRetryable && config.__retryCount < 2) {
      config.__retryCount++;
      // Exponential backoff: 1s, 2s
      await new Promise(r => setTimeout(r, config.__retryCount * 1000));
      return api(config);
    }
    // On 401, try refreshing session once
    if (status === 401 && config && !config.__authRetried) {
      config.__authRetried = true;
      try {
        // Try /auth/me to refresh the cookie session
        await api.get('/auth/me');
        return api(config);
      } catch {
        // Session truly expired - let calling code handle
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API helper functions for common operations
export const examApi = {
  // Student exam operations
  getAvailableExams: () => api.get('/student/exams'),
  getExamDetails: (examId: string) => api.get(`/student/exams/${examId}`),
  startExam: (examId: string) => api.post(`/student/exams/${examId}/start`),
  getSubmissionStatus: (submissionId: string) => 
    api.get(`/student/submissions/${submissionId}`),
  submitAnswer: (submissionId: string, data: any) => 
    api.post(`/student/submissions/${submissionId}/answer`, data),
  bulkSaveAnswers: (submissionId: string, answers: any[]) =>
    api.post(`/student/submissions/${submissionId}/answers`, { answers }),
  submitExam: (submissionId: string) => 
    api.post(`/student/submissions/${submissionId}/submit`),
  getResults: () => api.get('/student/results'),
  getSubmissionReview: (submissionId: string) => 
    api.get(`/student/submissions/${submissionId}/review`),
  reportViolation: (submissionId: string, data: any) =>
    api.post(`/student/submissions/${submissionId}/violation`, data),
  
  // Admin operations
  adminGetDashboard: () => api.get('/admin/dashboard'),
  adminGetExams: () => api.get('/admin/exams'),
  adminGetExam: (examId: string) => api.get(`/admin/exams/${examId}`),
  adminCreateExam: (data: any) => api.post('/admin/exams', data),
  adminUpdateExam: (examId: string, data: any) => 
    api.put(`/admin/exams/${examId}`, data),
  adminDeleteExam: (examId: string) => api.delete(`/admin/exams/${examId}`),
  adminPublishExam: (examId: string) => api.post(`/admin/exams/${examId}/publish`),
  adminArchiveExam: (examId: string) => api.post(`/admin/exams/${examId}/archive`),
  adminGetExamSubmissions: (examId: string) => 
    api.get(`/admin/exams/${examId}/submissions`),
  adminGetExamAnalytics: (examId: string) => 
    api.get(`/admin/exams/${examId}/analytics`),
  adminExportResults: (examId: string, format: 'csv' | 'json' = 'csv') => 
    api.get(`/admin/exams/${examId}/export?format=${format}`, { responseType: 'blob' }),
  
  // Question management
  adminGetQuestions: (examId: string) => api.get(`/admin/exams/${examId}/questions`),
  adminCreateQuestion: (examId: string, data: any) => 
    api.post(`/admin/exams/${examId}/questions`, data),
  adminUpdateQuestion: (questionId: string, data: any) => 
    api.put(`/admin/questions/${questionId}`, data),
  adminDeleteQuestion: (questionId: string) => api.delete(`/admin/questions/${questionId}`),
  
  // Category/Subject management for question bank
  adminGetCategories: () => api.get('/admin/categories'),
  adminCreateCategory: (data: any) => api.post('/admin/categories', data),
  adminUpdateCategory: (categoryId: string, data: any) => 
    api.put(`/admin/categories/${categoryId}`, data),
  adminDeleteCategory: (categoryId: string) => api.delete(`/admin/categories/${categoryId}`),
};
