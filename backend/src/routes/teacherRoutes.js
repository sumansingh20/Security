import express from 'express';
import adminController from '../controllers/adminController.js';
import questionController from '../controllers/questionController.js';
import violationController from '../controllers/violationController.js';
import categoryController from '../controllers/categoryController.js';
import batchController from '../controllers/batchController.js';
import examLifecycleController from '../controllers/examLifecycleController.js';
import { authenticate, authorize, validateSession } from '../middleware/auth.js';
import { validate, examSchemas, questionSchemas } from '../middleware/validation.js';
import { apiRateLimiter } from '../middleware/security.js';

const router = express.Router();

// Apply authentication and teacher/admin authorization to all routes
router.use(authenticate, validateSession, authorize('admin', 'teacher'), apiRateLimiter);

// Server time
router.get('/server-time', batchController.getServerTime);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Exam routes (teachers can view and manage their own exams)
router.route('/exams')
  .get(adminController.getExams)
  .post(validate(examSchemas.create), adminController.createExam);

router.route('/exams/:id')
  .get(adminController.getExamById)
  .put(validate(examSchemas.update), adminController.updateExam);

// Exam state management
router.post('/exams/:id/publish', examLifecycleController.publishExam);
router.post('/exams/:id/activate', examLifecycleController.activateExam);
router.post('/exams/:id/complete', examLifecycleController.completeExam);
router.post('/exams/:id/lock', examLifecycleController.lockExam);
router.get('/exams/:id/status', examLifecycleController.getExamStatus);

// Batch management
router.post('/exams/:examId/batches/generate', batchController.generateBatches);
router.get('/exams/:examId/batches', batchController.getExamBatches);
router.get('/batches/:batchId', batchController.getBatchDetails);
router.post('/batches/:batchId/start', batchController.startBatch);
router.post('/batches/:batchId/complete', batchController.completeBatch);

// Live monitoring
router.get('/monitor/sessions', batchController.getMonitorSessions);
router.get('/monitor/active-exams', batchController.getActiveExams);
router.post('/monitor/sessions/:sessionId/force-submit', batchController.forceSubmitSession);
router.post('/monitor/sessions/:sessionId/terminate', batchController.terminateSession);

// Exam results and analytics
router.get('/exams/:id/submissions', adminController.getExamSubmissions);
router.get('/exams/:id/analytics', adminController.getExamAnalytics);
router.get('/exams/:id/results', examLifecycleController.getExamResults);
router.get('/exams/:id/results/export', examLifecycleController.exportResults);
router.get('/exams/:id/export', adminController.exportExamResults);

// Individual submission details
router.get('/submissions/:submissionId', adminController.getSubmissionById);

// Violations
router.get('/exams/:examId/violations', violationController.getExamViolations);
router.get('/exams/:examId/violations/export', violationController.exportExamViolations);
router.get('/students/:studentId/violations', violationController.getStudentViolations);

// Question routes
router.route('/exams/:examId/questions')
  .get(questionController.getQuestions)
  .post(validate(questionSchemas.create), questionController.createQuestion);

router.post(
  '/exams/:examId/questions/bulk',
  validate(questionSchemas.bulkCreate),
  questionController.bulkCreateQuestions
);

router.put(
  '/exams/:examId/questions/reorder',
  questionController.reorderQuestions
);

router.route('/questions/:id')
  .get(questionController.getQuestionById)
  .put(validate(questionSchemas.update), questionController.updateQuestion)
  .delete(questionController.deleteQuestion);

// Global question listing for teachers (question bank)
router.get('/questions', questionController.getAllQuestions);

// Student listing for teachers (exam enrollment)
router.get('/users', adminController.getUsers);

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

// Question generation (AI/template-based)
router.post('/exams/:examId/questions/generate', questionController.generateQuestions);

export default router;
