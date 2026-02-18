import express from 'express';
import adminController from '../controllers/adminController.js';
import questionController from '../controllers/questionController.js';
import violationController from '../controllers/violationController.js';
import categoryController from '../controllers/categoryController.js';
import batchController from '../controllers/batchController.js';
import examLifecycleController from '../controllers/examLifecycleController.js';
import { authenticate, authorize, validateSession } from '../middleware/auth.js';
import { validate, examSchemas, questionSchemas, querySchemas, userSchemas } from '../middleware/validation.js';
import { apiRateLimiter } from '../middleware/security.js';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate, validateSession, authorize('admin'), apiRateLimiter);

// Server time endpoint (accessible to all authenticated admins)
router.get('/server-time', batchController.getServerTime);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User management routes
router.get('/users/online', adminController.getOnlineUsers);

router.route('/users')
  .get(adminController.getUsers)
  .post(validate(userSchemas.createUser), adminController.createUser);

router.post('/users/bulk', validate(userSchemas.bulkCreate), adminController.bulkImportUsers);

router.route('/users/:id')
  .get(adminController.getUserById)
  .put(validate(userSchemas.updateUser), adminController.updateUser)
  .delete(adminController.deleteUser);

// Exam routes
router.route('/exams')
  .get(adminController.getExams)
  .post(validate(examSchemas.create), adminController.createExam);

router.route('/exams/:id')
  .get(adminController.getExamById)
  .put(validate(examSchemas.update), adminController.updateExam)
  .delete(adminController.deleteExam);

router.post('/exams/:id/publish', examLifecycleController.publishExam);
router.post('/exams/:id/activate', examLifecycleController.activateExam);
router.post('/exams/:id/complete', examLifecycleController.completeExam);
router.post('/exams/:id/lock', examLifecycleController.lockExam);
router.get('/exams/:id/status', examLifecycleController.getExamStatus);
router.post('/exams/:id/archive', adminController.archiveExam);

// Batch management routes
router.get('/batches', batchController.getAllBatches);
router.post('/exams/:examId/batches/generate', batchController.generateBatches);
router.get('/exams/:examId/batches', batchController.getExamBatches);
router.get('/batches/:batchId', batchController.getBatchDetails);
router.post('/batches/:batchId/start', batchController.startBatch);
router.post('/batches/:batchId/complete', batchController.completeBatch);

// Live monitor routes
router.get('/monitor/sessions', batchController.getMonitorSessions);
router.get('/monitor/active-exams', batchController.getActiveExams);
router.post('/monitor/sessions/:sessionId/force-submit', batchController.forceSubmitSession);
router.post('/monitor/sessions/:sessionId/terminate', batchController.terminateSession);

// Exam sessions routes (alternative route for session inspector)
router.get('/exam-sessions', batchController.getMonitorSessions);
router.post('/exam-sessions/:sessionId/terminate', batchController.terminateSession);
router.post('/exam-sessions/:sessionId/force-submit', batchController.forceSubmitSession);

// Exam submissions and analytics
router.get('/exams/:id/submissions', adminController.getExamSubmissions);
router.get('/exams/:id/analytics', adminController.getExamAnalytics);
router.get('/exams/:id/results', examLifecycleController.getExamResults);
router.get('/exams/:id/results/export', examLifecycleController.exportResults);
router.get('/exams/:id/export', adminController.exportExamResults);
router.get('/exams/:examId/violations', violationController.getExamViolations);
router.get('/exams/:examId/violations/export', violationController.exportExamViolations);

// Individual submission details
router.get('/submissions/:submissionId', adminController.getSubmissionById);
router.put('/submissions/:submissionId/grade', adminController.gradeSubmission);

// Global listings (cross-exam)
router.get('/results', adminController.getAllResults);
router.get('/submissions', adminController.getAllSubmissions);
router.get('/violations', adminController.getAllViolations);

// Report routes
router.get('/reports/results', adminController.getReportResults);
router.get('/reports/exam-stats', adminController.getReportExamStats);

// Question routes
router.get('/questions', questionController.getAllQuestions);

router.route('/exams/:examId/questions')
  .get(questionController.getQuestions)
  .post(validate(questionSchemas.create), questionController.createQuestion);

router.post(
  '/exams/:examId/questions/bulk',
  validate(questionSchemas.bulkCreate),
  questionController.bulkCreateQuestions
);

router.post(
  '/exams/:examId/questions/generate',
  validate(questionSchemas.aiGenerate),
  questionController.generateQuestions
);

router.post(
  '/exams/:examId/questions/import',
  questionController.importQuestions
);

router.put(
  '/exams/:examId/questions/reorder',
  questionController.reorderQuestions
);

router.route('/questions/:id')
  .get(questionController.getQuestionById)
  .put(validate(questionSchemas.update), questionController.updateQuestion)
  .delete(questionController.deleteQuestion);

router.post('/questions/:id/duplicate', questionController.duplicateQuestion);

// Category routes (Question Bank)
router.get('/subjects', categoryController.getSubjects);

router.route('/categories')
  .get(categoryController.getCategories)
  .post(categoryController.createCategory);

router.route('/categories/:id')
  .get(categoryController.getCategoryById)
  .put(categoryController.updateCategory)
  .delete(categoryController.deleteCategory);

router.get('/categories/:id/questions', categoryController.getCategoryQuestions);

// Student violation view
router.get('/students/:studentId/violations', violationController.getStudentViolations);

// System settings routes
router.get('/system/settings', examLifecycleController.getSystemSettings);
router.put('/system/settings', examLifecycleController.updateSystemSettings);
router.get('/settings', examLifecycleController.getSystemSettings);
router.put('/settings', examLifecycleController.updateSystemSettings);

// Audit logs
router.get('/audit-logs', examLifecycleController.getAuditLogs);

export default router;
