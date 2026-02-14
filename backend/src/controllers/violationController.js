import { Violation, Submission, AuditLog } from '../models/index.js';
import config from '../config/index.js';
import { autoSubmitExam } from './studentController.js';
import AppError from '../utils/AppError.js';

// Safe Redis import
let redisClient = null;
try {
  const redis = await import('../config/redis.js');
  redisClient = redis.default;
} catch (e) {
  console.warn('[REDIS] Not available in violationController');
}

// Violation severity mapping
const violationSeverity = {
  'tab-switch': 'medium',
  'window-blur': 'medium',
  'copy-attempt': 'high',
  'paste-attempt': 'high',
  'right-click': 'low',
  'devtools-open': 'critical',
  'multiple-tabs': 'high',
  'screenshot-attempt': 'high',
  'print-attempt': 'high',
  'keyboard-shortcut': 'medium',
  'fullscreen-exit': 'medium',
  'other': 'low',
};

// @desc    Report violation
// @route   POST /api/student/submissions/:id/violation
// @access  Student
export const reportViolation = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: 'in-progress',
    }).populate('exam');

    if (!submission) {
      throw new AppError('Submission not found or already submitted', 404);
    }

    const { type, description, questionNumber, screenResolution } = req.body;
    const exam = submission.exam;

    // Check if proctoring is enabled
    if (!exam.enableProctoring) {
      return res.json({
        success: true,
        message: 'Proctoring disabled',
        data: { acknowledged: false },
      });
    }

    // Create violation record
    const violation = await Violation.create({
      submission: submission._id,
      exam: exam._id,
      student: req.user._id,
      type,
      severity: violationSeverity[type] || 'low',
      description,
      questionNumber,
      userAgent: req.headers['user-agent'],
      screenResolution,
    });

    // Increment violation count (Redis or fallback)
    let violationCount = submission.totalViolations + 1;
    if (redisClient) {
      try {
        violationCount = await redisClient.incrementViolation(submission.sessionId);
      } catch (e) {
        // Fallback to database count
      }
    }

    // Update submission violation count
    submission.totalViolations = violationCount;
    await submission.save();

    // Determine action
    let action = 'none';
    let warningMessage = null;
    let shouldAutoSubmit = false;

    if (violationCount >= exam.maxViolationsBeforeSubmit) {
      action = 'auto-submit';
      shouldAutoSubmit = true;
    } else if (violationCount >= exam.maxViolationsBeforeWarning) {
      action = 'warning';
      warningMessage = `Warning: ${violationCount} violations detected. Exam will be auto-submitted after ${exam.maxViolationsBeforeSubmit - violationCount} more violations.`;
    }

    // Update violation with action
    violation.actionTaken = action;
    violation.warningShown = action === 'warning';
    await violation.save();

    // Log violation
    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      action: action === 'auto-submit' ? 'violation-auto-submit' : 'violation-detected',
      targetType: 'submission',
      targetId: submission._id,
      details: {
        violationType: type,
        violationCount,
        action,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: action === 'auto-submit' ? 'failure' : 'warning',
    });

    // Auto-submit if threshold exceeded
    if (shouldAutoSubmit) {
      await autoSubmitExam(submission, 'auto-violation');

      return res.json({
        success: true,
        message: 'Maximum violations exceeded. Exam has been auto-submitted.',
        data: {
          acknowledged: true,
          action: 'auto-submit',
          violationCount,
          examSubmitted: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        acknowledged: true,
        action,
        violationCount,
        warningMessage,
        remainingViolations: exam.maxViolationsBeforeSubmit - violationCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get violations for submission
// @route   GET /api/student/submissions/:id/violations
// @access  Student
export const getViolations = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
    });

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const violations = await Violation.find({ submission: submission._id })
      .sort({ timestamp: -1 });

    const summary = await Violation.getViolationsByType(submission._id);

    res.json({
      success: true,
      data: {
        violations,
        summary,
        totalCount: violations.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get violations for exam (Admin)
// @route   GET /api/admin/exams/:examId/violations
// @access  Admin
export const getExamViolations = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, severity, type, search } = req.query;
    
    const query = { exam: req.params.examId };
    
    if (severity && severity !== 'all') {
      query.severity = severity;
    }
    if (type && type !== 'all') {
      query.type = type;
    }

    let violations = await Violation.find(query)
      .populate('student', 'firstName lastName email studentId')
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      violations = violations.filter(v => 
        v.student?.firstName?.toLowerCase().includes(searchLower) ||
        v.student?.lastName?.toLowerCase().includes(searchLower) ||
        v.student?.studentId?.toLowerCase().includes(searchLower)
      );
    }

    const total = await Violation.countDocuments(query);
    const summary = await Violation.getExamViolationSummary(req.params.examId);

    res.json({
      success: true,
      data: {
        violations,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export violations for exam (Admin)
// @route   GET /api/admin/exams/:examId/violations/export
// @access  Admin
export const exportExamViolations = async (req, res, next) => {
  try {
    const violations = await Violation.find({ exam: req.params.examId })
      .populate('student', 'firstName lastName email studentId rollNumber')
      .sort({ timestamp: -1 });

    // Generate CSV
    const headers = ['Timestamp', 'Student ID', 'Roll Number', 'Student Name', 'Email', 'Violation Type', 'Severity', 'Description', 'IP Address', 'Action Taken'];
    const rows = violations.map(v => [
      v.timestamp ? new Date(v.timestamp).toISOString() : '',
      v.student?.studentId || '',
      v.student?.rollNumber || '',
      v.student ? `${v.student.firstName} ${v.student.lastName}` : '',
      v.student?.email || '',
      v.type || '',
      v.severity || '',
      v.description || '',
      v.ipAddress || '',
      v.actionTaken || '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=violations_${req.params.examId}_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Get student violations (Admin)
// @route   GET /api/admin/students/:studentId/violations
// @access  Admin
export const getStudentViolations = async (req, res, next) => {
  try {
    const violations = await Violation.find({ student: req.params.studentId })
      .populate('exam', 'title subject')
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      data: { violations },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  reportViolation,
  getViolations,
  getExamViolations,
  exportExamViolations,
  getStudentViolations,
};
