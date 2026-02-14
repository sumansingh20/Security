import express from 'express';
import { examSessionController, batchController } from '../controllers/examSessionController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiters for exam security
const examLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

const heartbeatLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 2, // 2 requests per second
  message: { success: false, message: 'Too many requests' },
});

// ==========================================
// STUDENT EXAM SESSION ROUTES (Public during exam)
// ==========================================

// Student login to exam with DOB
router.post('/login', examLoginLimiter, examSessionController.examLogin);

// Get exam session data
router.get('/session/:sessionToken', examSessionController.getExamSession);

// Save answer (auto-save)
router.post('/session/:sessionToken/answer', examSessionController.saveAnswer);

// Report violation (from client)
router.post('/session/:sessionToken/violation', examSessionController.reportViolation);

// Submit exam
router.post('/session/:sessionToken/submit', examSessionController.submitExam);

// Heartbeat - sync time and keep alive
router.post('/session/:sessionToken/heartbeat', heartbeatLimiter, examSessionController.heartbeat);

// ==========================================
// TEACHER/ADMIN BATCH MANAGEMENT ROUTES
// ==========================================

// Create batches for exam
router.post(
  '/:examId/batches',
  authenticate,
  authorize('admin', 'teacher'),
  batchController.createBatches
);

// Start next batch
router.post(
  '/:examId/batches/start-next',
  authenticate,
  authorize('admin', 'teacher'),
  batchController.startNextBatch
);

// Get batch status
router.get(
  '/:examId/batches/status',
  authenticate,
  authorize('admin', 'teacher'),
  batchController.getBatchStatus
);

// Lock specific batch
router.post(
  '/:examId/batches/:batchNumber/lock',
  authenticate,
  authorize('admin', 'teacher'),
  batchController.lockBatch
);

export default router;
