import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import redisClient from '../config/redis.js';
import { Submission, Violation, AuditLog } from '../models/index.js';
import { autoSubmitExam } from '../controllers/studentController.js';
import logger from '../utils/logger.js';

// Socket authentication middleware
export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return next(new Error('Token has been invalidated'));
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Verify session
    const session = await redisClient.getSession(decoded.id);
    if (!session || session.invalidated) {
      return next(new Error('Session expired'));
    }

    socket.userId = decoded.id;
    socket.userEmail = decoded.email;
    socket.userRole = decoded.role;

    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Invalid token'));
  }
};

// Socket event handlers
export const setupSocketHandlers = (io) => {
  // Exam namespace for student exam sessions
  const examNamespace = io.of('/exam');
  
  examNamespace.use(socketAuth);

  examNamespace.on('connection', (socket) => {
    logger.info(`Exam socket connected: ${socket.userId}`);

    // Join exam room
    socket.on('join-exam', async (data) => {
      try {
        const { submissionId } = data;

        // Verify submission belongs to user
        const submission = await Submission.findOne({
          _id: submissionId,
          student: socket.userId,
          status: 'in-progress',
        }).populate('exam');

        if (!submission) {
          socket.emit('error', { message: 'Invalid submission' });
          return;
        }

        // Join submission room
        socket.join(`submission:${submissionId}`);
        socket.submissionId = submissionId;
        socket.examId = submission.exam._id.toString();

        // Send current state
        const state = await redisClient.getExamState(submission.sessionId);
        const answers = await redisClient.getExamAnswers(submission.sessionId);

        socket.emit('exam-state', {
          submission: {
            id: submission._id,
            remainingTime: submission.remainingTime,
            serverEndTime: submission.serverEndTime,
            paletteState: submission.paletteState,
          },
          answers,
          serverTime: Date.now(),
        });

        // Start time sync interval
        startTimeSync(socket, submission);

        logger.info(`User ${socket.userId} joined exam ${socket.examId}`);
      } catch (error) {
        logger.error('Join exam error:', error);
        socket.emit('error', { message: 'Failed to join exam' });
      }
    });

    // Save answer
    socket.on('save-answer', async (data) => {
      try {
        const { questionId, selectedOptions, markedForReview, timeTaken } = data;

        if (!socket.submissionId) {
          socket.emit('error', { message: 'Not in an exam session' });
          return;
        }

        const submission = await Submission.findById(socket.submissionId);
        
        if (!submission || submission.status !== 'in-progress') {
          socket.emit('exam-submitted', { reason: 'Exam no longer active' });
          return;
        }

        // Check time
        if (submission.isTimeUp()) {
          await autoSubmitExam(submission, 'auto-timeout');
          socket.emit('exam-submitted', { 
            reason: 'Time expired',
            results: {
              marksObtained: submission.marksObtained,
              totalMarks: submission.totalMarks,
            },
          });
          return;
        }

        // Update answer
        const answer = submission.answers.find(
          a => a.question.toString() === questionId
        );

        if (answer) {
          answer.selectedOptions = selectedOptions || [];
          answer.markedForReview = markedForReview || false;
          answer.visited = true;
          answer.timeTaken = timeTaken || 0;
          if (selectedOptions && selectedOptions.length > 0) {
            answer.answeredAt = new Date();
          }
          await submission.save();

          // Update Redis
          await redisClient.updateExamAnswer(submission.sessionId, questionId, {
            selectedOptions,
            markedForReview,
            visited: true,
            timeTaken,
          });
        }

        socket.emit('answer-saved', {
          questionId,
          paletteState: submission.paletteState,
          serverTime: Date.now(),
        });
      } catch (error) {
        logger.error('Save answer error:', error);
        socket.emit('error', { message: 'Failed to save answer' });
      }
    });

    // Report violation
    socket.on('violation', async (data) => {
      try {
        const { type, description, questionNumber } = data;

        if (!socket.submissionId) return;

        const submission = await Submission.findById(socket.submissionId)
          .populate('exam');

        if (!submission || submission.status !== 'in-progress') return;

        const exam = submission.exam;
        if (!exam.enableProctoring) return;

        // Create violation
        const violation = await Violation.create({
          submission: submission._id,
          exam: exam._id,
          student: socket.userId,
          type,
          description,
          questionNumber,
        });

        // Increment count
        const violationCount = await redisClient.incrementViolation(submission.sessionId);
        submission.totalViolations = violationCount;
        await submission.save();

        // Check thresholds
        if (violationCount >= exam.maxViolationsBeforeSubmit) {
          await autoSubmitExam(submission, 'auto-violation');
          
          socket.emit('exam-submitted', {
            reason: 'Maximum violations exceeded',
            results: {
              marksObtained: submission.marksObtained,
              totalMarks: submission.totalMarks,
            },
          });

          await AuditLog.log({
            user: socket.userId,
            action: 'violation-auto-submit',
            targetType: 'submission',
            targetId: submission._id,
            details: { violationCount, type },
            status: 'failure',
          });
        } else if (violationCount >= exam.maxViolationsBeforeWarning) {
          socket.emit('violation-warning', {
            count: violationCount,
            remaining: exam.maxViolationsBeforeSubmit - violationCount,
            message: `Warning: ${violationCount} violations detected.`,
          });
        } else {
          socket.emit('violation-logged', {
            count: violationCount,
            type,
          });
        }
      } catch (error) {
        logger.error('Violation handling error:', error);
      }
    });

    // Submit exam
    socket.on('submit-exam', async () => {
      try {
        if (!socket.submissionId) return;

        const submission = await Submission.findById(socket.submissionId);
        
        if (!submission || submission.status !== 'in-progress') {
          socket.emit('error', { message: 'Exam already submitted' });
          return;
        }

        const timeTaken = Math.floor((Date.now() - submission.startedAt.getTime()) / 1000);

        submission.status = 'submitted';
        submission.submittedAt = new Date();
        submission.submissionType = 'manual';
        submission.timeTaken = timeTaken;

        await submission.calculateResults();
        await submission.save();

        await redisClient.deleteExamState(submission.sessionId);

        socket.emit('exam-submitted', {
          reason: 'Manual submission',
          results: {
            marksObtained: submission.marksObtained,
            totalMarks: submission.totalMarks,
            percentage: submission.percentage,
            questionsAttempted: submission.questionsAttempted,
            correctAnswers: submission.correctAnswers,
          },
        });

        await AuditLog.log({
          user: socket.userId,
          action: 'exam-submit',
          targetType: 'submission',
          targetId: submission._id,
          details: { marksObtained: submission.marksObtained },
          status: 'success',
        });

        logger.info(`Exam submitted by ${socket.userId}`);
      } catch (error) {
        logger.error('Submit exam error:', error);
        socket.emit('error', { message: 'Failed to submit exam' });
      }
    });

    // Heartbeat for connection status
    socket.on('heartbeat', async () => {
      if (!socket.submissionId) return;

      const submission = await Submission.findById(socket.submissionId);
      
      if (submission && submission.status === 'in-progress') {
        socket.emit('heartbeat-ack', {
          serverTime: Date.now(),
          remainingTime: submission.remainingTime,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.userId}, reason: ${reason}`);
      
      if (socket.timeSyncInterval) {
        clearInterval(socket.timeSyncInterval);
      }
    });
  });

  // Admin namespace for monitoring
  const adminNamespace = io.of('/admin');
  
  adminNamespace.use(socketAuth);
  adminNamespace.use((socket, next) => {
    if (socket.userRole !== 'admin') {
      return next(new Error('Admin access required'));
    }
    next();
  });

  adminNamespace.on('connection', (socket) => {
    logger.info(`Admin socket connected: ${socket.userId}`);

    // Monitor exam
    socket.on('monitor-exam', async (data) => {
      const { examId } = data;
      socket.join(`admin:exam:${examId}`);
      
      // Get active submissions
      const submissions = await Submission.find({
        exam: examId,
        status: 'in-progress',
      }).populate('student', 'firstName lastName email studentId');

      socket.emit('exam-status', {
        activeStudents: submissions.length,
        students: submissions.map(s => ({
          id: s._id,
          student: s.student,
          startedAt: s.startedAt,
          violations: s.totalViolations,
        })),
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Admin socket disconnected: ${socket.userId}`);
    });
  });

  return io;
};

// Time sync helper
function startTimeSync(socket, submission) {
  socket.timeSyncInterval = setInterval(async () => {
    try {
      const currentSubmission = await Submission.findById(submission._id);
      
      if (!currentSubmission || currentSubmission.status !== 'in-progress') {
        clearInterval(socket.timeSyncInterval);
        return;
      }

      const remainingTime = currentSubmission.remainingTime;

      if (remainingTime <= 0) {
        await autoSubmitExam(currentSubmission, 'auto-timeout');
        
        socket.emit('exam-submitted', {
          reason: 'Time expired',
          results: {
            marksObtained: currentSubmission.marksObtained,
            totalMarks: currentSubmission.totalMarks,
          },
        });
        
        clearInterval(socket.timeSyncInterval);
        return;
      }

      // Send time update every 10 seconds
      socket.emit('time-sync', {
        remainingTime,
        serverTime: Date.now(),
      });

      // Warning at 5 minutes
      if (remainingTime <= 300 && remainingTime > 295) {
        socket.emit('time-warning', { minutesLeft: 5 });
      }

      // Warning at 1 minute
      if (remainingTime <= 60 && remainingTime > 55) {
        socket.emit('time-warning', { minutesLeft: 1 });
      }
    } catch (error) {
      logger.error('Time sync error:', error);
    }
  }, 10000); // Every 10 seconds
}

export default { socketAuth, setupSocketHandlers };
