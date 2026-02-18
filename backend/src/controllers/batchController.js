import { Exam, ExamBatch, ExamSession, User, Submission, Violation, AuditLog } from '../models/index.js';
import AppError from '../utils/AppError.js';

// Get current server time
export const getServerTime = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        serverTime: new Date().toISOString(),
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate batches for an exam
// @route   POST /api/admin/exams/:examId/batches/generate
// @access  Admin
export const generateBatches = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'draft') {
      throw new AppError('Can only generate batches for draft exams', 400);
    }

    const { students, batchSize = 500 } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      throw new AppError('Student list is required', 400);
    }

    // Delete existing batches
    await ExamBatch.deleteMany({ exam: exam._id });

    // Calculate number of batches
    const totalBatches = Math.ceil(students.length / batchSize);
    const batchDuration = exam.duration + (exam.batchBufferMinutes || 15);
    
    const batches = [];
    let currentStartTime = new Date(exam.startTime);

    for (let i = 0; i < totalBatches; i++) {
      const batchStudents = students.slice(i * batchSize, (i + 1) * batchSize);
      const batchEndTime = new Date(currentStartTime.getTime() + batchDuration * 60 * 1000);

      const batch = await ExamBatch.create({
        exam: exam._id,
        batchNumber: i + 1,
        rollNumberStart: batchStudents[0]?.rollNumber || `BATCH${i + 1}-START`,
        rollNumberEnd: batchStudents[batchStudents.length - 1]?.rollNumber || `BATCH${i + 1}-END`,
        students: batchStudents.map(s => s._id || s),
        maxCapacity: batchSize,
        totalEnrolled: batchStudents.length,
        scheduledStart: currentStartTime,
        scheduledEnd: batchEndTime,
        status: 'pending',
      });

      batches.push(batch);
      
      // Next batch starts after buffer
      currentStartTime = new Date(batchEndTime.getTime());
    }

    // Update exam with batch info
    exam.enableBatching = true;
    exam.batchSize = batchSize;
    exam.enrolledStudents = students.map(s => s._id || s);
    await exam.save();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'batches-generated',
      targetType: 'exam',
      targetId: exam._id,
      details: { totalBatches, totalStudents: students.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: `Generated ${totalBatches} batch(es) for ${students.length} students`,
      data: { batches },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all batches (across all exams)
// @route   GET /api/admin/batches
// @access  Admin
export const getAllBatches = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, examId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (examId) query.exam = examId;
    if (search) query.name = { $regex: search, $options: 'i' };

    const [batches, total] = await Promise.all([
      ExamBatch.find(query)
        .populate('exam', 'title subject status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExamBatch.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        batches: (batches || []).map(b => ({
          ...b,
          studentCount: b.students?.length || 0
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all batches for an exam
// @route   GET /api/admin/exams/:examId/batches
// @access  Admin/Teacher
export const getExamBatches = async (req, res, next) => {
  try {
    const batches = await ExamBatch.find({ exam: req.params.examId })
      .sort({ batchNumber: 1 })
      .populate('students', 'firstName lastName email studentId rollNumber');

    const exam = await Exam.findById(req.params.examId);

    res.json({
      success: true,
      data: {
        exam: exam ? {
          _id: exam._id,
          title: exam.title,
          status: exam.status,
          enableBatching: exam.enableBatching,
          batchSize: exam.batchSize,
        } : null,
        batches,
        summary: {
          totalBatches: batches.length,
          pending: batches.filter(b => b.status === 'pending').length,
          queued: batches.filter(b => b.status === 'queued').length,
          active: batches.filter(b => b.status === 'active').length,
          completed: batches.filter(b => b.status === 'completed').length,
          locked: batches.filter(b => b.status === 'locked').length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get batch details
// @route   GET /api/admin/batches/:batchId
// @access  Admin/Teacher
export const getBatchDetails = async (req, res, next) => {
  try {
    const batch = await ExamBatch.findById(req.params.batchId)
      .populate('exam', 'title status duration')
      .populate('students', 'firstName lastName email studentId rollNumber')
      .populate('lockedBy', 'firstName lastName email');

    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    // Get session statistics
    const sessions = await ExamSession.find({ 
      exam: batch.exam._id,
      batch: batch.batchNumber
    }).populate('student', 'firstName lastName studentId');

    res.json({
      success: true,
      data: {
        batch,
        sessions,
        statistics: {
          enrolled: batch.totalEnrolled,
          logged: sessions.length,
          active: sessions.filter(s => s.status === 'active').length,
          submitted: sessions.filter(s => ['submitted', 'force_submitted', 'expired'].includes(s.status)).length,
          violations: sessions.reduce((sum, s) => sum + s.violationCount, 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start batch manually (admin override)
// @route   POST /api/admin/batches/:batchId/start
// @access  Admin
export const startBatch = async (req, res, next) => {
  try {
    const batch = await ExamBatch.findById(req.params.batchId);
    
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    if (batch.isLocked) {
      throw new AppError('Batch is locked and cannot be modified', 400);
    }

    if (batch.status === 'active') {
      throw new AppError('Batch is already active', 400);
    }

    if (batch.status === 'completed' || batch.status === 'locked') {
      throw new AppError('Batch has already completed', 400);
    }

    await batch.start(req.user._id);

    // Update exam status if this is the first active batch
    const exam = await Exam.findById(batch.exam);
    if (exam && exam.status === 'published') {
      exam.status = 'ongoing';
      await exam.save();
    }

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'batch-started-manual',
      targetType: 'batch',
      targetId: batch._id,
      details: { batchNumber: batch.batchNumber, examId: batch.exam },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: `Batch ${batch.batchNumber} started`,
      data: { batch },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete batch and lock
// @route   POST /api/admin/batches/:batchId/complete
// @access  Admin
export const completeBatch = async (req, res, next) => {
  try {
    const batch = await ExamBatch.findById(req.params.batchId);
    
    if (!batch) {
      throw new AppError('Batch not found', 404);
    }

    if (batch.isLocked) {
      throw new AppError('Batch is already locked', 400);
    }

    // Force submit all active sessions
    const activeSessions = await ExamSession.find({
      exam: batch.exam,
      batch: batch.batchNumber,
      status: 'active',
    });

    for (const session of activeSessions) {
      session.status = 'force_submitted';
      session.submittedAt = new Date();
      session.auditLog.push({
        action: 'force_submitted_batch_complete',
        details: { reason: 'Batch completed by admin' },
      });
      await session.save();

      // Update corresponding submission
      await Submission.findOneAndUpdate(
        { exam: batch.exam, student: session.student },
        { 
          status: 'force-submitted',
          submittedAt: new Date(),
        }
      );
    }

    // Update statistics
    const submissions = await Submission.find({
      exam: batch.exam,
      student: { $in: batch.students },
    });

    batch.totalAttempted = submissions.filter(s => s.status !== 'in-progress').length;
    batch.totalSubmitted = submissions.filter(s => 
      ['submitted', 'auto-submitted', 'force-submitted', 'violation-submitted'].includes(s.status)
    ).length;

    await batch.complete(req.user._id);

    // Check if all batches completed
    const remainingActive = await ExamBatch.countDocuments({
      exam: batch.exam,
      status: { $in: ['pending', 'queued', 'active'] },
    });

    if (remainingActive === 0) {
      const exam = await Exam.findById(batch.exam);
      if (exam) {
        exam.status = 'completed';
        await exam.save();
      }
    }

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'batch-completed-locked',
      targetType: 'batch',
      targetId: batch._id,
      details: { 
        batchNumber: batch.batchNumber,
        forcedSubmissions: activeSessions.length,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: `Batch ${batch.batchNumber} completed and locked`,
      data: { 
        batch,
        forcedSubmissions: activeSessions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get batch status for student login check
// @route   GET /api/student/batch-status/:examId
// @access  Student
export const checkStudentBatchStatus = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    const now = new Date();
    
    // Find the batch this student belongs to
    const batch = await ExamBatch.findOne({
      exam: exam._id,
      students: req.user._id,
    });

    if (!batch) {
      return res.json({
        success: true,
        data: {
          canLogin: false,
          reason: 'You are not enrolled in this examination',
          serverTime: now,
        },
      });
    }

    // Check batch window
    const isWithinWindow = now >= batch.scheduledStart && now <= batch.scheduledEnd;
    const isBatchActive = batch.status === 'active';
    const isBatchLocked = batch.isLocked;

    let canLogin = false;
    let reason = '';

    if (isBatchLocked) {
      reason = 'Your batch has ended and is locked';
    } else if (!isBatchActive && batch.status === 'pending') {
      reason = `Your batch (${batch.batchNumber}) has not started yet. Scheduled: ${batch.scheduledStart.toLocaleString()}`;
    } else if (!isWithinWindow) {
      if (now < batch.scheduledStart) {
        reason = `Your batch window opens at ${batch.scheduledStart.toLocaleString()}`;
      } else {
        reason = 'Your batch window has closed';
      }
    } else if (batch.currentCount >= batch.maxCapacity) {
      reason = 'Batch capacity reached. Please wait.';
    } else {
      canLogin = true;
    }

    res.json({
      success: true,
      data: {
        canLogin,
        reason: canLogin ? 'Ready to start' : reason,
        batchNumber: batch.batchNumber,
        batchStatus: batch.status,
        scheduledStart: batch.scheduledStart,
        scheduledEnd: batch.scheduledEnd,
        serverTime: now,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auto-advance batches (cron job or scheduled task)
// @route   POST /api/system/batch-advance
// @access  System
export const autoBatchAdvance = async (req, res, next) => {
  try {
    const now = new Date();
    const results = {
      started: [],
      completed: [],
      errors: [],
    };

    // Find batches that should start
    const batchesToStart = await ExamBatch.find({
      status: 'pending',
      scheduledStart: { $lte: now },
      isLocked: false,
    }).populate('exam');

    for (const batch of batchesToStart) {
      try {
        if (batch.exam.status !== 'published' && batch.exam.status !== 'ongoing') {
          continue;
        }
        
        batch.status = 'active';
        batch.actualStart = now;
        batch.auditLog.push({
          action: 'batch_auto_started',
          timestamp: now,
          details: { scheduledStart: batch.scheduledStart },
        });
        await batch.save();

        // Update exam status
        if (batch.exam.status === 'published') {
          batch.exam.status = 'ongoing';
          await batch.exam.save();
        }

        results.started.push({
          examId: batch.exam._id,
          batchNumber: batch.batchNumber,
        });
      } catch (err) {
        results.errors.push({
          batchId: batch._id,
          error: err.message,
        });
      }
    }

    // Find batches that should end
    const batchesToEnd = await ExamBatch.find({
      status: 'active',
      scheduledEnd: { $lte: now },
      isLocked: false,
    });

    for (const batch of batchesToEnd) {
      try {
        // Force submit all active sessions
        await ExamSession.updateMany(
          { exam: batch.exam, batch: batch.batchNumber, status: 'active' },
          { 
            status: 'expired',
            submittedAt: now,
            $push: {
              auditLog: {
                action: 'auto_submitted_batch_end',
                timestamp: now,
              },
            },
          }
        );

        batch.status = 'completed';
        batch.actualEnd = now;
        batch.isLocked = true;
        batch.lockedAt = now;
        batch.auditLog.push({
          action: 'batch_auto_completed',
          timestamp: now,
          details: { scheduledEnd: batch.scheduledEnd },
        });
        await batch.save();

        results.completed.push({
          examId: batch.exam,
          batchNumber: batch.batchNumber,
        });
      } catch (err) {
        results.errors.push({
          batchId: batch._id,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: 'Batch advance completed',
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live monitor data
// @route   GET /api/admin/monitor/sessions
// @access  Admin/Teacher
export const getMonitorSessions = async (req, res, next) => {
  try {
    const { examId } = req.query;
    const query = { status: 'active' };
    
    if (examId) {
      query.exam = examId;
    }

    const sessions = await ExamSession.find(query)
      .populate('exam', 'title duration')
      .populate('student', 'firstName lastName email studentId rollNumber')
      .sort({ lastActivityAt: -1 })
      .lean();

    const formattedSessions = (sessions || [])
      .filter(session => session && session.student && session.exam) // Skip null populated refs
      .map(session => {
      const now = new Date();
      const timeRemaining = Math.max(0, Math.floor((new Date(session.serverEndTime) - now) / 1000));
      const lastActivity = Math.floor((now - new Date(session.lastActivityAt)) / 1000);
      const answers = session.answers || [];
      
      return {
        _id: session._id,
        student: session.student,
        exam: session.exam,
        startTime: session.startedAt,
        lastActivity: session.lastActivityAt,
        timeRemaining,
        questionsAnswered: answers.filter(a => 
          a.selectedOption !== null || a.textAnswer
        ).length,
        totalQuestions: answers.length,
        violationCount: session.violationCount || 0,
        ipAddress: session.ipAddress,
        batchNumber: session.batch,
        status: lastActivity > 300 ? 'idle' : 'active',
        sessionId: session._id,
      };
    });

    res.json({
      success: true,
      data: { sessions: formattedSessions },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active exams for monitor
// @route   GET /api/admin/monitor/active-exams
// @access  Admin/Teacher
export const getActiveExams = async (req, res, next) => {
  try {
    const activeExams = await Exam.find({
      status: { $in: ['published', 'ongoing'] },
      startTime: { $lte: new Date() },
      endTime: { $gte: new Date() },
    }).select('title startTime endTime').lean();

    const examsWithStats = await Promise.all(
      (activeExams || []).map(async (exam) => {
        const activeSessions = await ExamSession.countDocuments({
          exam: exam._id,
          status: 'active',
        });

        const totalEnrolled = await Submission.countDocuments({
          exam: exam._id,
        });

        const currentBatch = await ExamBatch.findOne({
          exam: exam._id,
          status: 'active',
        });

        return {
          _id: exam._id,
          title: exam.title || 'Untitled',
          startTime: exam.startTime,
          endTime: exam.endTime,
          activeStudents: activeSessions || 0,
          totalStudents: totalEnrolled || activeSessions || 0,
          batchNumber: currentBatch?.batchNumber || 1,
        };
      })
    );

    res.json({
      success: true,
      data: examsWithStats || [],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Force submit a session
// @route   POST /api/admin/monitor/sessions/:sessionId/force-submit
// @access  Admin
export const forceSubmitSession = async (req, res, next) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId);
    
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.status !== 'active') {
      throw new AppError('Session is not active', 400);
    }

    session.status = 'force_submitted';
    session.submittedAt = new Date();
    session.auditLog.push({
      action: 'force_submitted_by_admin',
      timestamp: new Date(),
      details: { adminId: req.user._id },
    });
    await session.save();

    // Update submission
    await Submission.findOneAndUpdate(
      { exam: session.exam, student: session.student, status: 'in-progress' },
      { status: 'force-submitted', submittedAt: new Date() }
    );

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'session-force-submitted',
      targetType: 'session',
      targetId: session._id,
      details: { studentId: session.student },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Session force-submitted',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Terminate a session
// @route   POST /api/admin/monitor/sessions/:sessionId/terminate
// @access  Admin
export const terminateSession = async (req, res, next) => {
  try {
    const session = await ExamSession.findById(req.params.sessionId);
    
    if (!session) {
      throw new AppError('Session not found', 404);
    }

    session.status = 'violation_terminated';
    session.submittedAt = new Date();
    session.auditLog.push({
      action: 'terminated_by_admin',
      timestamp: new Date(),
      details: { 
        adminId: req.user._id,
        reason: req.body.reason || 'Admin termination',
      },
    });
    await session.save();

    // Update submission
    await Submission.findOneAndUpdate(
      { exam: session.exam, student: session.student, status: 'in-progress' },
      { 
        status: 'violation-submitted',
        submittedAt: new Date(),
        terminationReason: req.body.reason || 'Admin termination',
      }
    );

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'session-terminated',
      targetType: 'session',
      targetId: session._id,
      details: { studentId: session.student, reason: req.body.reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Session terminated',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getServerTime,
  generateBatches,
  getAllBatches,
  getExamBatches,
  getBatchDetails,
  startBatch,
  completeBatch,
  checkStudentBatchStatus,
  autoBatchAdvance,
  getMonitorSessions,
  getActiveExams,
  forceSubmitSession,
  terminateSession,
};
