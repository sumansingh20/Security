import express from 'express';
import studentController from '../controllers/studentController.js';
import violationController from '../controllers/violationController.js';
import batchController from '../controllers/batchController.js';
import { authenticate, authorize, validateSession } from '../middleware/auth.js';
import { validate, answerSchemas, violationSchemas } from '../middleware/validation.js';
import { examRateLimiter } from '../middleware/security.js';

const router = express.Router();

// Apply authentication and student authorization to all routes
router.use(authenticate, validateSession, authorize('student'));

// Server time endpoint
router.get('/server-time', batchController.getServerTime);

// Batch status check
router.get('/batch-status/:examId', batchController.checkStudentBatchStatus);

// Exam routes
router.get('/exams', studentController.getAvailableExams);
router.get('/exams/:id', studentController.getExamDetails);
router.post('/exams/:id/start', studentController.startExam);

// Submission routes (with higher rate limit for auto-save)
router.get('/submissions/:id', studentController.getSubmissionStatus);

router.post(
  '/submissions/:id/answer',
  examRateLimiter,
  validate(answerSchemas.saveAnswer),
  studentController.saveAnswer
);

router.post(
  '/submissions/:id/answers',
  examRateLimiter,
  validate(answerSchemas.bulkSave),
  studentController.bulkSaveAnswers
);

router.post('/submissions/:id/visit', examRateLimiter, studentController.visitQuestion);
router.post('/submissions/:id/submit', studentController.submitExam);
router.get('/submissions/:id/review', studentController.getExamReview);

// Violation routes
router.post(
  '/submissions/:id/violation',
  examRateLimiter,
  validate(violationSchemas.report),
  violationController.reportViolation
);

router.get('/submissions/:id/violations', violationController.getViolations);

// Results
router.get('/results', studentController.getStudentResults);
router.get('/results/:resultId', studentController.getResultDetails);

export default router;
