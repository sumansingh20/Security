import crypto from 'crypto';
import ExamSession from '../models/ExamSession.js';
import ExamBatch from '../models/ExamBatch.js';
import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import Violation from '../models/Violation.js';
import Submission from '../models/Submission.js';
import AppError from '../utils/AppError.js';

// Generate secure session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Validate DOB password format (DD-MM-YYYY or DDMMYYYY)
const validateDOBPassword = (password, userDOB) => {
  if (!userDOB) return false;
  
  const dob = new Date(userDOB);
  const day = String(dob.getDate()).padStart(2, '0');
  const month = String(dob.getMonth() + 1).padStart(2, '0');
  const year = dob.getFullYear();
  
  const validFormats = [
    `${day}${month}${year}`,      // DDMMYYYY
    `${day}-${month}-${year}`,    // DD-MM-YYYY
    `${day}/${month}/${year}`,    // DD/MM/YYYY
    `${year}-${month}-${day}`,    // YYYY-MM-DD
  ];
  
  return validFormats.includes(password);
};

// Check if student can access exam (within exam window)
const canAccessExam = async (examId, studentId) => {
  const exam = await Exam.findById(examId);
  if (!exam) {
    return { allowed: false, reason: 'exam_not_found' };
  }
  
  const now = new Date();
  
  // Check if exam is published/ongoing and active
  if (!['published', 'ongoing'].includes(exam.status)) {
    return { allowed: false, reason: 'exam_not_active' };
  }
  
  // Check exam window
  if (now < exam.startTime) {
    return { 
      allowed: false, 
      reason: 'exam_not_started',
      startsIn: Math.ceil((exam.startTime - now) / 1000),
    };
  }
  
  if (now > exam.endTime) {
    return { allowed: false, reason: 'exam_ended' };
  }
  
// Check if student is enrolled (or all students allowed)
  if (exam.allowAllStudents) {
    // All students can access
  } else {
    const isEnrolled = (exam.enrolledStudents || []).some(
      s => s.toString() === studentId.toString()
    ) || (exam.allowedStudents || []).some(
      s => s.toString() === studentId.toString()
    );
    
    if (!isEnrolled) {
      return { allowed: false, reason: 'not_enrolled' };
    }
  }
  
// Check batch assignment (only if batching is enabled)
  if (exam.enableBatching) {
    const activeBatch = await ExamBatch.getActiveBatch(examId);
    if (!activeBatch) {
      return { allowed: false, reason: 'no_active_batch' };
    }
    
    // Check if student is in active batch
    const studentInBatch = activeBatch.students?.some(
      s => s.toString() === studentId.toString()
    );
    
    if (!studentInBatch) {
      // Check if student is queued for later batch
      const queuedBatch = await ExamBatch.findOne({
        exam: examId,
        students: studentId,
        status: { $in: ['pending', 'queued'] },
      });
      
      if (queuedBatch) {
        return { 
          allowed: false, 
          reason: 'batch_not_active',
          batchNumber: queuedBatch.batchNumber,
          message: `You are in Batch ${queuedBatch.batchNumber}. Please wait for your turn.`,
        };
      }
      
      return { allowed: false, reason: 'not_in_any_batch' };
    }
    
    // Check batch capacity
    if (!activeBatch.canAcceptStudent()) {
      return { allowed: false, reason: 'batch_full' };
    }
    
    return { allowed: true, batch: activeBatch };
  }
  
  // Check for existing session
  const existingSession = await ExamSession.findActiveSession(examId, studentId);
  if (existingSession) {
    return { 
      allowed: false, 
      reason: 'session_exists',
      sessionToken: existingSession.sessionToken,
    };
  }
  
  return { allowed: true, batch: null };
};

// Exam Session Controller
export const examSessionController = {
  // Student login with DOB during exam window
  async examLogin(req, res, next) {
    try {
      const { examId, userId, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const fingerprint = req.body.fingerprint || req.headers['x-browser-fingerprint'];
      
      if (!fingerprint) {
        throw new AppError('Browser fingerprint required', 400);
      }
      
      // Find student by userId (studentId or email)
      const student = await User.findOne({
        $or: [
          { studentId: userId },
          { email: userId },
        ],
        role: 'student',
      });
      
      if (!student) {
        throw new AppError('Invalid credentials', 401);
      }
      
      // Validate DOB password
      if (!validateDOBPassword(password, student.dateOfBirth)) {
        // Log failed attempt (no submission exists yet, so use AuditLog instead)
        console.warn(`[DOB-LOGIN] Failed attempt for student ${userId} on exam ${examId}`);
        
        throw new AppError('Invalid credentials', 401);
      }
      
      // Check if student can access exam
      const accessCheck = await canAccessExam(examId, student._id);
      if (!accessCheck.allowed) {
        // Special case: session_exists means student can resume
        if (accessCheck.reason === 'session_exists' && accessCheck.sessionToken) {
          return res.status(200).json({
            success: false,
            reason: 'session_exists',
            sessionToken: accessCheck.sessionToken,
            examId,
            message: 'You have an existing active session. Resuming...',
          });
        }
        return res.status(403).json({
          success: false,
          reason: accessCheck.reason,
          message: accessCheck.message || `Access denied: ${accessCheck.reason}`,
          startsIn: accessCheck.startsIn,
          batchNumber: accessCheck.batchNumber,
        });
      }
      
      // Check for duplicate login attempt
      const existingSession = await ExamSession.findOne({
        exam: examId,
        student: student._id,
        status: 'active',
      });
      
      if (existingSession) {
        // Allow resume from same fingerprint, block from different device
        if (existingSession.browserFingerprint === fingerprint) {
          // Resume existing session
          const questionCount = await Question.countDocuments({ exam: examId, isActive: true });
          const exam = await Exam.findById(examId);
          return res.status(200).json({
            success: true,
            sessionToken: existingSession.sessionToken,
            examId,
            studentId: student._id,
            studentName: `${student.firstName} ${student.lastName}`,
            duration: exam.duration,
            serverEndTime: existingSession.serverEndTime,
            remainingTime: existingSession.getRemainingTime(),
            totalQuestions: questionCount,
            title: exam.title,
            resumed: true,
          });
        }
        
        // Violation: Multiple login attempt from different device
        await existingSession.addViolation(
          'multiple_login',
          `Login attempt from different device. Original IP: ${existingSession.ipAddress}, New IP: ${ipAddress}`,
          ipAddress
        );
        
        throw new AppError('You already have an active session on another device. Multiple logins are not allowed.', 403);
      }
      
      // Get exam details
      const exam = await Exam.findById(examId);
      
      // Get question count
      const questionCount = await Question.countDocuments({ exam: examId, isActive: true });
      
      // Create new session - cap end time to exam window
      const sessionToken = generateSessionToken();
      const durationEnd = new Date(Date.now() + exam.duration * 60 * 1000);
      const examEnd = exam.endTime ? new Date(exam.endTime) : durationEnd;
      const serverEndTime = durationEnd < examEnd ? durationEnd : examEnd;
      
      const batchNumber = accessCheck.batch ? accessCheck.batch.batchNumber : 1;
      
      const session = await ExamSession.create({
        exam: examId,
        student: student._id,
        batch: batchNumber,
        sessionToken,
        ipAddress,
        browserFingerprint: fingerprint,
        userAgent,
        serverEndTime,
        maxViolationsAllowed: exam.maxViolationsBeforeSubmit || 5,
        auditLog: [{
          action: 'session_created',
          details: { ipAddress, userAgent },
          ipAddress,
        }],
      });
      
      // Update batch count if batching enabled
      if (accessCheck.batch) {
        await accessCheck.batch.addStudent();
      }
      
      res.status(200).json({
        success: true,
        sessionToken,
        examId,
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        duration: exam.duration,
        serverEndTime,
        remainingTime: session.getRemainingTime(),
        totalQuestions: questionCount,
        title: exam.title,
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Validate session and get exam data
  async getExamSession(req, res, next) {
    try {
      const { sessionToken } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const fingerprint = req.headers['x-browser-fingerprint'];
      
      const validation = await ExamSession.validateSession(sessionToken, ipAddress, fingerprint);
      
      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          reason: validation.reason,
          terminated: true,
        });
      }
      
      const session = validation.session;
      const exam = await Exam.findById(session.exam);
      
      // Fetch questions from the Question collection
      const questions = await Question.find({ exam: session.exam, isActive: true })
        .select('-correctOptions -explanation')
        .sort({ questionNumber: 1 });
      
      // Update activity
      session.lastActivityAt = new Date();
      session.auditLog.push({
        action: 'session_accessed',
        ipAddress,
      });
      await session.save();
      
      res.json({
        success: true,
        session: {
          id: session._id,
          status: session.status,
          remainingTime: session.getRemainingTime(),
          currentQuestionIndex: session.currentQuestionIndex,
          answeredCount: session.answers.length,
          violationCount: session.violationCount,
          maxViolations: session.maxViolationsAllowed,
        },
        exam: {
          id: exam._id,
          title: exam.title,
          instructions: exam.instructions,
          totalQuestions: questions.length,
          duration: exam.duration,
          negativeMarking: exam.negativeMarking,
          negativeMarkValue: exam.negativeMarkValue,
        },
        questions: questions.map((q, index) => {
          // Map backend question types to frontend display types
          let frontendType = 'mcq';
          switch (q.questionType) {
            case 'mcq-single': frontendType = 'mcq'; break;
            case 'mcq-multiple': frontendType = 'mcq_multiple'; break;
            case 'true-false': frontendType = 'true_false'; break;
            case 'fill-blank': frontendType = 'short_answer'; break;
            case 'short-answer': frontendType = 'short_answer'; break;
            case 'numerical': frontendType = 'numerical'; break;
            case 'long-answer': frontendType = 'essay'; break;
            case 'code': frontendType = 'essay'; break;
            case 'matching': frontendType = 'matching'; break;
            case 'ordering': frontendType = 'ordering'; break;
            case 'image-based': frontendType = 'short_answer'; break;
            default: frontendType = 'mcq'; break;
          }
          return {
            id: q._id,
            index,
            text: q.questionText,
            type: frontendType,
            backendType: q.questionType,
            options: q.options?.map(opt => ({ text: opt.text, _id: opt._id })),
            marks: q.marks,
            imageUrl: q.imageUrl,
            matchPairs: q.matchPairs?.map(p => ({ left: p.left, right: p.right })),
            correctOrder: q.questionType === 'ordering' ? q.correctOrder?.map((_, i) => `Item ${i + 1}`) : undefined,
            orderItems: q.correctOrder,
            section: q.section,
          };
        }),
        answers: session.answers.map(a => ({
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          textAnswer: a.textAnswer,
        })),
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Save answer (auto-save)
  async saveAnswer(req, res, next) {
    try {
      const { sessionToken } = req.params;
      const { questionId, selectedOption, textAnswer } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const fingerprint = req.headers['x-browser-fingerprint'];
      
      const validation = await ExamSession.validateSession(sessionToken, ipAddress, fingerprint);
      
      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          reason: validation.reason,
          terminated: true,
        });
      }
      
      const session = validation.session;
      
      // Check if time expired
      if (session.isExpired()) {
        await session.forceSubmit('time_expired', ipAddress);
        return res.status(403).json({
          success: false,
          reason: 'time_expired',
          terminated: true,
        });
      }
      
      await session.saveAnswer(questionId, { selectedOption, textAnswer }, ipAddress);
      
      res.json({
        success: true,
        remainingTime: session.getRemainingTime(),
        autoSaveCount: session.autoSaveCount,
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Report violation
  async reportViolation(req, res, next) {
    try {
      const { sessionToken } = req.params;
      const { type, details } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      const session = await ExamSession.findOne({ sessionToken });
      
      if (!session || session.status !== 'active') {
        return res.status(404).json({ success: false });
      }
      
      const terminated = await session.addViolation(type, details, ipAddress);
      
      // Also log to Violation model for reporting
      await Violation.create({
        exam: session.exam,
        student: session.student,
        submission: session._id,
        type,
        description: details,
        ipAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
      });
      
      res.json({
        success: true,
        violationCount: session.violationCount,
        maxViolations: session.maxViolationsAllowed,
        terminated,
        remainingTime: session.getRemainingTime(),
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Submit exam
  async submitExam(req, res, next) {
    try {
      const { sessionToken } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const fingerprint = req.headers['x-browser-fingerprint'];
      
      const validation = await ExamSession.validateSession(sessionToken, ipAddress, fingerprint);
      
      if (!validation.valid && validation.reason !== 'session_expired') {
        return res.status(403).json({
          success: false,
          reason: validation.reason,
        });
      }
      
      const session = validation.session || await ExamSession.findOne({ sessionToken });
      
      if (!session) {
        throw new AppError('Session not found', 404);
      }
      
      if (session.status === 'submitted' || session.status === 'force_submitted') {
        return res.json({
          success: true,
          message: 'Exam already submitted',
          submittedAt: session.submittedAt,
        });
      }
      
      await session.submit(ipAddress);
      
      // Auto-grade the exam session
      let score = 0;
      let totalMarks = 0;
      let correctCount = 0;
      let wrongCount = 0;
      
      try {
        const questions = await Question.find({ exam: session.exam, isActive: true });
        const questionMap = new Map();
        questions.forEach(q => questionMap.set(q._id.toString(), q));
        
        for (const ans of session.answers) {
          const q = questionMap.get(ans.questionId.toString());
          if (!q) continue;
          totalMarks += q.marks || 1;
          
          if (q.questionType === 'mcq-single' || q.questionType === 'mcq-multiple' || q.questionType === 'true-false') {
            if (ans.selectedOption !== undefined && ans.selectedOption !== null) {
              const correctOptionIds = (q.correctOptions || []).map(id => id.toString());
              const selectedOptionObj = q.options[ans.selectedOption];
              if (selectedOptionObj && correctOptionIds.includes(selectedOptionObj._id.toString())) {
                score += q.marks || 1;
                correctCount++;
              } else {
                wrongCount++;
              }
            }
          } else if (q.questionType === 'numerical') {
            const numAnswer = parseFloat(ans.textAnswer);
            const correctNum = parseFloat(q.correctAnswer);
            const tolerance = q.answerTolerance || 0;
            if (!isNaN(numAnswer) && !isNaN(correctNum) && Math.abs(numAnswer - correctNum) <= tolerance) {
              score += q.marks || 1;
              correctCount++;
            } else if (ans.textAnswer) {
              wrongCount++;
            }
          } else if (q.questionType === 'fill-blank' || q.questionType === 'short-answer') {
            if (ans.textAnswer && q.correctAnswer) {
              const acceptedAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
              const isCorrect = acceptedAnswers.some(accepted =>
                ans.textAnswer.trim().toLowerCase() === String(accepted).trim().toLowerCase()
              );
              if (isCorrect) {
                score += q.marks || 1;
                correctCount++;
              } else {
                wrongCount++;
              }
            }
          }
          // long-answer, code, matching, ordering need manual grading
        }
        
        session.score = score;
        session.totalMarks = totalMarks;
        session.correctCount = correctCount;
        session.wrongCount = wrongCount;
        session.questionsAttempted = session.answers.length;
        await session.save();

        // =====================================================
        // CREATE SUBMISSION RECORD so results appear in the app
        // =====================================================
        try {
          // Check if submission already exists for this student+exam
          const existingSubmission = await Submission.findOne({
            exam: session.exam,
            student: session.student,
            status: { $in: ['submitted', 'auto-submitted', 'evaluated'] },
          });

          if (!existingSubmission) {
            // Build answers array for Submission model
            const submissionAnswers = [];
            let qIndex = 0;
            for (const ans of session.answers) {
              const q = questionMap.get(ans.questionId.toString());
              if (!q) continue;
              qIndex++;
              
              const answerEntry = {
                question: ans.questionId,
                questionNumber: qIndex,
                selectedOptions: [],
                visited: true,
                markedForReview: false,
                answeredAt: ans.answeredAt || new Date(),
                timeTaken: ans.timeTaken || 0,
                isCorrect: null,
                marksObtained: 0,
              };

              // Convert selectedOption index to option ObjectId for MCQ types
              if ((q.questionType === 'mcq-single' || q.questionType === 'mcq-multiple' || q.questionType === 'true-false') 
                  && ans.selectedOption !== undefined && ans.selectedOption !== null) {
                const selectedOpt = q.options[ans.selectedOption];
                if (selectedOpt) {
                  answerEntry.selectedOptions = [selectedOpt._id];
                }
              }

              submissionAnswers.push(answerEntry);
            }

            // Also add unanswered questions
            for (const q of questions) {
              const alreadyAdded = submissionAnswers.some(a => a.question.toString() === q._id.toString());
              if (!alreadyAdded) {
                submissionAnswers.push({
                  question: q._id,
                  questionNumber: submissionAnswers.length + 1,
                  selectedOptions: [],
                  visited: false,
                  markedForReview: false,
                  answeredAt: null,
                  timeTaken: 0,
                  isCorrect: null,
                  marksObtained: 0,
                });
              }
            }

            const submission = await Submission.create({
              exam: session.exam,
              student: session.student,
              attemptNumber: 1,
              startedAt: session.createdAt,
              submittedAt: session.submittedAt || new Date(),
              serverEndTime: session.serverEndTime,
              answers: submissionAnswers,
              questionOrder: questions.map(q => q._id),
              totalMarks: totalMarks,
              marksObtained: score,
              percentage: totalMarks > 0 ? (score / totalMarks) * 100 : 0,
              questionsAttempted: session.answers.length,
              correctAnswers: correctCount,
              wrongAnswers: wrongCount,
              unattempted: questions.length - session.answers.length,
              status: 'evaluated',
              submissionType: 'manual',
              totalViolations: session.violationCount,
              sessionId: session.sessionToken,
              ipHash: session.ipAddress,
              userAgent: session.userAgent,
            });

            // Run calculateResults for accurate grading with the Question model's checkAnswer
            try {
              await submission.calculateResults();
              submission.status = 'evaluated';
              await submission.save();
            } catch (calcErr) {
              console.error('Calculate results error:', calcErr);
              // Submission still created with basic scoring
            }
          }
        } catch (submissionErr) {
          console.error('Submission creation error:', submissionErr);
          // Don't fail the exam submit if submission creation fails
        }
      } catch (gradingErr) {
        console.error('Auto-grading error:', gradingErr);
      }
      
      // Update batch stats
      const batch = await ExamBatch.findOne({
        exam: session.exam,
        batchNumber: session.batch,
      });
      
      if (batch && !batch.isLocked) {
        batch.totalSubmitted += 1;
        batch.totalViolations += session.violationCount;
        await batch.save();
      }
      
      res.json({
        success: true,
        message: 'Exam submitted successfully',
        submittedAt: session.submittedAt,
        answeredQuestions: session.answers.length,
        totalViolations: session.violationCount,
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Heartbeat - keep session alive and sync time
  async heartbeat(req, res, next) {
    try {
      const { sessionToken } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const fingerprint = req.headers['x-browser-fingerprint'];
      
      const validation = await ExamSession.validateSession(sessionToken, ipAddress, fingerprint);
      
      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          reason: validation.reason,
          terminated: true,
        });
      }
      
      const session = validation.session;
      session.lastActivityAt = new Date();
      await session.save();
      
      // Check if time expired
      if (session.isExpired()) {
        await session.forceSubmit('time_expired', ipAddress);
        return res.json({
          success: false,
          reason: 'time_expired',
          terminated: true,
          remainingTime: 0,
        });
      }
      
      res.json({
        success: true,
        remainingTime: session.getRemainingTime(),
        serverTime: new Date().toISOString(),
        status: session.status,
        violationCount: session.violationCount,
      });
      
    } catch (error) {
      next(error);
    }
  },
};

// Batch Management Controller (Teacher/Admin)
export const batchController = {
  // Create batches for exam
  async createBatches(req, res, next) {
    try {
      const { examId } = req.params;
      const { batchSize = 500, studentList } = req.body;
      
      const exam = await Exam.findById(examId);
      if (!exam) {
        throw new AppError('Exam not found', 404);
      }
      
      // Get all enrolled students
      const students = studentList || exam.enrolledStudents || [];
      const totalStudents = students.length;
      const totalBatches = Math.ceil(totalStudents / batchSize);
      
      const batches = [];
      const examDuration = exam.duration; // minutes
      const bufferTime = 15; // minutes between batches
      
      let currentStartTime = new Date(exam.startTime);
      
      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize;
        const endIndex = Math.min(startIndex + batchSize, totalStudents);
        const batchStudents = students.slice(startIndex, endIndex);
        
        const batchEndTime = new Date(currentStartTime.getTime() + examDuration * 60 * 1000);
        
        const batch = await ExamBatch.create({
          exam: examId,
          batchNumber: i + 1,
          rollNumberStart: batchStudents[0]?.toString() || '',
          rollNumberEnd: batchStudents[batchStudents.length - 1]?.toString() || '',
          students: batchStudents,
          maxCapacity: batchSize,
          scheduledStart: currentStartTime,
          scheduledEnd: batchEndTime,
          totalEnrolled: batchStudents.length,
          status: i === 0 ? 'queued' : 'pending',
          auditLog: [{
            action: 'batch_created',
            performedBy: req.user._id,
            details: { studentCount: batchStudents.length },
          }],
        });
        
        batches.push(batch);
        
        // Next batch starts after current batch ends + buffer
        currentStartTime = new Date(batchEndTime.getTime() + bufferTime * 60 * 1000);
      }
      
      res.status(201).json({
        success: true,
        totalBatches,
        totalStudents,
        batches: batches.map(b => ({
          batchNumber: b.batchNumber,
          studentCount: b.students.length,
          scheduledStart: b.scheduledStart,
          scheduledEnd: b.scheduledEnd,
          status: b.status,
        })),
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Start next batch
  async startNextBatch(req, res, next) {
    try {
      const { examId } = req.params;
      
      // Complete current active batch if any
      const activeBatch = await ExamBatch.getActiveBatch(examId);
      if (activeBatch) {
        // Force submit all active sessions
        await ExamSession.updateMany(
          { exam: examId, batch: activeBatch.batchNumber, status: 'active' },
          { 
            status: 'force_submitted', 
            submittedAt: new Date(),
            $push: {
              auditLog: {
                action: 'batch_ended_force_submit',
                timestamp: new Date(),
              }
            }
          }
        );
        
        await activeBatch.complete(req.user._id);
      }
      
      // Get and start next batch
      const nextBatch = await ExamBatch.getNextPendingBatch(examId);
      if (!nextBatch) {
        return res.json({
          success: true,
          message: 'All batches completed',
          allCompleted: true,
        });
      }
      
      await nextBatch.start(req.user._id);
      
      res.json({
        success: true,
        batch: {
          batchNumber: nextBatch.batchNumber,
          studentCount: nextBatch.students.length,
          scheduledStart: nextBatch.scheduledStart,
          scheduledEnd: nextBatch.scheduledEnd,
          status: nextBatch.status,
        },
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Get batch status
  async getBatchStatus(req, res, next) {
    try {
      const { examId } = req.params;
      
      const batches = await ExamBatch.find({ exam: examId }).sort({ batchNumber: 1 });
      
      const batchStats = await Promise.all(batches.map(async (batch) => {
        const activeCount = await ExamSession.countDocuments({
          exam: examId,
          batch: batch.batchNumber,
          status: 'active',
        });
        
        const submittedCount = await ExamSession.countDocuments({
          exam: examId,
          batch: batch.batchNumber,
          status: { $in: ['submitted', 'force_submitted'] },
        });
        
        return {
          batchNumber: batch.batchNumber,
          status: batch.status,
          isLocked: batch.isLocked,
          totalEnrolled: batch.totalEnrolled,
          maxCapacity: batch.maxCapacity,
          activeCount,
          submittedCount,
          scheduledStart: batch.scheduledStart,
          scheduledEnd: batch.scheduledEnd,
          actualStart: batch.actualStart,
          actualEnd: batch.actualEnd,
          totalViolations: batch.totalViolations,
        };
      }));
      
      res.json({
        success: true,
        batches: batchStats,
      });
      
    } catch (error) {
      next(error);
    }
  },
  
  // Lock batch manually
  async lockBatch(req, res, next) {
    try {
      const { examId, batchNumber } = req.params;
      
      const batch = await ExamBatch.findOne({ exam: examId, batchNumber });
      if (!batch) {
        throw new AppError('Batch not found', 404);
      }
      
      if (batch.isLocked) {
        return res.json({ success: true, message: 'Batch already locked' });
      }
      
      // Force submit all active sessions
      await ExamSession.updateMany(
        { exam: examId, batch: parseInt(batchNumber), status: 'active' },
        { 
          status: 'force_submitted', 
          submittedAt: new Date(),
        }
      );
      
      await batch.complete(req.user._id);
      
      res.json({
        success: true,
        message: `Batch ${batchNumber} locked successfully`,
      });
      
    } catch (error) {
      next(error);
    }
  },
};

export default { examSessionController, batchController };
