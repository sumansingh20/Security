import { Exam, Question, Submission, ExamBatch, ExamSession, User, AuditLog, Violation } from '../models/index.js';
import AppError from '../utils/AppError.js';
import config from '../config/index.js';

// System settings - can be loaded from database/config
const SYSTEM_SETTINGS = {
  // General
  siteName: 'ProctoredExam',
  siteDescription: 'Secure Proctored Examination System',
  maintenanceMode: false,
  maintenanceMessage: 'System is under maintenance. Please try again later.',
  // Security
  sessionTimeout: 3600,
  maxLoginAttempts: 5,
  lockoutDuration: 7200,
  enforceIPBinding: true,
  enforceBrowserBinding: true,
  // Exam
  maxBatchSize: 500,
  defaultBatchSize: 500,
  sessionTimeoutMinutes: 180,
  defaultExamDuration: 180,
  examBufferMinutes: 15,
  defaultMaxViolations: 3,
  autoSubmitOnViolation: true,
  emergencyFreeze: false,
  // Authentication / DOB Login
  dobLoginEnabled: true,
  dobLoginFormat: 'DDMMYYYY',
  dobFormat: 'DDMMYYYY',
  allowExamWindowOnly: true,
};

// @desc    Get system settings
// @route   GET /api/admin/system/settings
// @access  Admin
export const getSystemSettings = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        settings: SYSTEM_SETTINGS,
        serverTime: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/system/settings
// @access  Admin
export const updateSystemSettings = async (req, res, next) => {
  try {
    const allowedFields = Object.keys(SYSTEM_SETTINGS);

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        SYSTEM_SETTINGS[key] = req.body[key];
      }
    }

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'system-settings-updated',
      targetType: 'system',
      details: { settings: req.body },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Settings updated',
      data: { settings: SYSTEM_SETTINGS },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if system is frozen
export const checkEmergencyFreeze = (req, res, next) => {
  if (SYSTEM_SETTINGS.emergencyFreeze) {
    return res.status(503).json({
      success: false,
      message: 'System is in emergency freeze mode. No modifications allowed.',
    });
  }
  next();
};

// @desc    Get comprehensive audit logs
// @route   GET /api/admin/audit-logs
// @access  Admin
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      user,
      targetType,
      startDate,
      endDate,
      status,
    } = req.query;

    const query = {};

    if (action) query.action = new RegExp(action, 'i');
    if (user) query.user = user;
    if (targetType) query.targetType = targetType;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Exam state transition: PUBLISH
// @route   POST /api/admin/exams/:id/publish
// @access  Admin
export const publishExam = async (req, res, next) => {
  try {
    if (SYSTEM_SETTINGS.emergencyFreeze) {
      throw new AppError('System is frozen. Cannot publish exams.', 503);
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'draft') {
      throw new AppError(`Cannot publish exam with status: ${exam.status}`, 400);
    }

    // Validate questions exist
    const questionCount = await Question.countDocuments({ exam: exam._id, isActive: true });
    if (questionCount === 0) {
      throw new AppError('Cannot publish exam without questions', 400);
    }

    // Calculate total marks
    const questions = await Question.find({ exam: exam._id, isActive: true });
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

    // Lock the exam configuration
    exam.status = 'published';
    exam.totalMarks = totalMarks;
    exam.publishedAt = new Date();
    exam.publishedBy = req.user._id;
    await exam.save();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-published',
      targetType: 'exam',
      targetId: exam._id,
      details: { 
        questionCount,
        totalMarks,
        duration: exam.duration,
        startTime: exam.startTime,
        endTime: exam.endTime,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam published successfully. Configuration is now locked.',
      data: { exam },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Exam state transition: ACTIVATE (auto or manual)
// @route   POST /api/admin/exams/:id/activate
// @access  Admin
export const activateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'published') {
      throw new AppError(`Cannot activate exam with status: ${exam.status}. Must be published first.`, 400);
    }

    const now = new Date();
    const durationMs = (exam.duration || 60) * 60 * 1000;

    // Always ensure the exam window is valid from now
    // If startTime is in the past, keep it (exam was scheduled)
    // If startTime is in the future, push it to now so students can start immediately
    if (exam.startTime > now) {
      exam.startTime = now;
    }

    // Ensure endTime gives enough time: at least duration from now
    const minimumEndTime = new Date(now.getTime() + durationMs);
    if (!exam.endTime || exam.endTime <= now || exam.endTime < minimumEndTime) {
      exam.endTime = minimumEndTime;
    }

    exam.status = 'ongoing';
    exam.activatedAt = now;
    await exam.save();

    // Start first batch if batching enabled
    if (exam.enableBatching) {
      const firstBatch = await ExamBatch.findOne({
        exam: exam._id,
        status: 'pending',
      }).sort({ batchNumber: 1 });

      if (firstBatch) {
        firstBatch.status = 'active';
        firstBatch.actualStart = new Date();
        await firstBatch.save();
      }
    }

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-activated',
      targetType: 'exam',
      targetId: exam._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam activated',
      data: { exam },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Exam state transition: COMPLETE
// @route   POST /api/admin/exams/:id/complete
// @access  Admin
export const completeExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'ongoing') {
      throw new AppError(`Cannot complete exam with status: ${exam.status}`, 400);
    }

    // Force submit all active sessions
    const activeSessions = await ExamSession.find({
      exam: exam._id,
      status: 'active',
    });

    for (const session of activeSessions) {
      session.status = 'force_submitted';
      session.submittedAt = new Date();
      await session.save();
    }

    // Force submit all in-progress submissions and calculate results
    const inProgressSubs = await Submission.find({ exam: exam._id, status: 'in-progress' });
    for (const sub of inProgressSubs) {
      sub.status = 'auto-submitted';
      sub.submissionType = 'admin-force';
      sub.submittedAt = new Date();
      sub.timeTaken = Math.floor((Date.now() - sub.startedAt.getTime()) / 1000);
      await sub.calculateResults();
      await sub.save();
    }

    // Lock all batches
    await ExamBatch.updateMany(
      { exam: exam._id, isLocked: false },
      { 
        status: 'locked',
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: req.user._id,
      }
    );

    exam.status = 'completed';
    exam.completedAt = new Date();
    await exam.save();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-completed',
      targetType: 'exam',
      targetId: exam._id,
      details: { forcedSubmissions: activeSessions.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam completed and locked',
      data: { 
        exam,
        forcedSubmissions: activeSessions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Exam state transition: LOCK (archive)
// @route   POST /api/admin/exams/:id/lock
// @access  Admin
export const lockExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'completed') {
      throw new AppError(`Cannot lock exam with status: ${exam.status}. Must complete first.`, 400);
    }

    exam.status = 'archived';
    exam.archivedAt = new Date();
    exam.archivedBy = req.user._id;
    await exam.save();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-locked',
      targetType: 'exam',
      targetId: exam._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam locked permanently',
      data: { exam },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam status with actions
// @route   GET /api/admin/exams/:id/status
// @access  Admin/Teacher
export const getExamStatus = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('publishedBy', 'firstName lastName email');

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Get counts
    const questionCount = await Question.countDocuments({ exam: exam._id, isActive: true });
    const submissionCount = await Submission.countDocuments({ exam: exam._id });
    const activeSessionCount = await ExamSession.countDocuments({ exam: exam._id, status: 'active' });

    // Determine allowed actions based on status
    const actions = {
      canEdit: exam.status === 'draft',
      canAddQuestions: exam.status === 'draft',
      canPublish: exam.status === 'draft' && questionCount > 0,
      canActivate: exam.status === 'published',
      canComplete: exam.status === 'ongoing',
      canLock: exam.status === 'completed',
      canDelete: exam.status === 'draft' && submissionCount === 0,
      canViewResults: ['completed', 'archived'].includes(exam.status),
      isReadOnly: ['published', 'ongoing', 'completed', 'archived'].includes(exam.status),
    };

    res.json({
      success: true,
      data: {
        exam,
        counts: {
          questions: questionCount,
          submissions: submissionCount,
          activeSessions: activeSessionCount,
        },
        actions,
        serverTime: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export results (CSV/PDF)
// @route   GET /api/admin/exams/:id/results/export
// @access  Admin
export const exportResults = async (req, res, next) => {
  try {
    const { format = 'csv', batchNumber } = req.query;
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (!['completed', 'archived'].includes(exam.status)) {
      throw new AppError('Results can only be exported after exam completion', 400);
    }

    // Build query
    const submissionQuery = { exam: exam._id };
    
    // If batch filtering
    if (batchNumber && exam.enableBatching) {
      const batch = await ExamBatch.findOne({ exam: exam._id, batchNumber: parseInt(batchNumber) });
      if (batch) {
        submissionQuery.student = { $in: batch.students };
      }
    }

    const submissions = await Submission.find(submissionQuery)
      .populate('student', 'firstName lastName email studentId rollNumber department batch')
      .sort({ marksObtained: -1 });

    if (format === 'csv') {
      const headers = [
        'Roll Number',
        'Student ID',
        'Name',
        'Email',
        'Department',
        'Batch',
        'Marks Obtained',
        'Total Marks',
        'Percentage',
        'Status',
        'Time Taken (min)',
        'Violations',
        'Submitted At',
      ];

      const rows = submissions.map(sub => [
        sub.student?.rollNumber || '',
        sub.student?.studentId || '',
        sub.student ? `${sub.student.firstName} ${sub.student.lastName}` : '',
        sub.student?.email || '',
        sub.student?.department || '',
        sub.student?.batch || '',
        sub.marksObtained || 0,
        exam.totalMarks || 0,
        exam.totalMarks > 0 ? ((sub.marksObtained / exam.totalMarks) * 100).toFixed(2) : 0,
        sub.status,
        sub.timeTaken ? Math.round(sub.timeTaken / 60) : 0,
        sub.totalViolations || 0,
        sub.submittedAt ? sub.submittedAt.toISOString() : '',
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${exam.title.replace(/[^a-z0-9]/gi, '_')}_results.csv"`);
      return res.send(csv);
    }

    // JSON format
    res.json({
      success: true,
      data: {
        exam: {
          title: exam.title,
          subject: exam.subject,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
        },
        submissions: submissions.map(sub => ({
          student: {
            rollNumber: sub.student?.rollNumber,
            studentId: sub.student?.studentId,
            name: sub.student ? `${sub.student.firstName} ${sub.student.lastName}` : '',
            email: sub.student?.email,
            department: sub.student?.department,
            batch: sub.student?.batch,
          },
          marksObtained: sub.marksObtained,
          percentage: exam.totalMarks > 0 ? ((sub.marksObtained / exam.totalMarks) * 100).toFixed(2) : 0,
          status: sub.status,
          timeTaken: sub.timeTaken,
          totalViolations: sub.totalViolations || 0,
          submittedAt: sub.submittedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get results by batch
// @route   GET /api/admin/exams/:id/results
// @access  Admin/Teacher
export const getExamResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, batchNumber, sortBy = '-marksObtained' } = req.query;
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Build query
    const query = { exam: exam._id };
    
    if (batchNumber && exam.enableBatching) {
      const batch = await ExamBatch.findOne({ exam: exam._id, batchNumber: parseInt(batchNumber) });
      if (batch) {
        query.student = { $in: batch.students };
      }
    }

    const submissions = await Submission.find(query)
      .populate('student', 'firstName lastName email studentId rollNumber')
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments(query);

    // Get batch info if batching enabled
    let batches = [];
    if (exam.enableBatching) {
      batches = await ExamBatch.find({ exam: exam._id })
        .select('batchNumber status totalEnrolled totalSubmitted')
        .sort({ batchNumber: 1 });
    }

    // Calculate statistics
    const allScores = await Submission.find({ exam: exam._id }).select('marksObtained');
    const scores = allScores.map(s => s.marksObtained || 0);
    
    const stats = {
      totalSubmissions: scores.length,
      average: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      highest: scores.length > 0 ? Math.max(...scores) : 0,
      lowest: scores.length > 0 ? Math.min(...scores) : 0,
      passed: scores.filter(s => s >= exam.passingMarks).length,
      failed: scores.filter(s => s < exam.passingMarks).length,
    };

    res.json({
      success: true,
      data: {
        exam: {
          _id: exam._id,
          title: exam.title,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
          status: exam.status,
        },
        submissions,
        results: submissions,
        batches,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getSystemSettings,
  updateSystemSettings,
  checkEmergencyFreeze,
  getAuditLogs,
  publishExam,
  activateExam,
  completeExam,
  lockExam,
  getExamStatus,
  exportResults,
  getExamResults,
};
