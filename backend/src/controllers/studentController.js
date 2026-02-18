import { Exam, Question, Submission, Violation, AuditLog } from '../models/index.js';
import AppError from '../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';

// Safe Redis import - may not be available
let redisClient = null;
try {
  const redis = await import('../config/redis.js');
  redisClient = redis.default;
} catch (e) {
  console.warn('[REDIS] Not available, using database only');
}

// @desc    Get available exams for student
// @route   GET /api/student/exams
// @access  Student
export const getAvailableExams = async (req, res, next) => {
  try {
    const now = new Date();

    // Get exams where student is allowed (published or ongoing)
    const query = {
      status: { $in: ['published', 'ongoing'] },
      $or: [
        { allowAllStudents: true },
        { allowedStudents: req.user._id },
      ],
    };

    const exams = await Exam.find(query)
      .select('title subject description duration startTime endTime maxAttempts calculatorEnabled calculatorType')
      .sort({ startTime: 1 });

    // Get submission counts for each exam
    const examsWithStatus = await Promise.all(
      exams.map(async (exam) => {
        const attemptCount = await Submission.getAttemptCount(exam._id, req.user._id);
        const activeSubmission = await Submission.getActiveSubmission(exam._id, req.user._id);

        let status;
        if (now < exam.startTime) {
          status = 'upcoming';
        } else if (now > exam.endTime) {
          status = 'ended';
        } else if (activeSubmission) {
          status = 'in-progress';
        } else if (attemptCount >= exam.maxAttempts) {
          status = 'completed';
        } else {
          status = 'available';
        }

        return {
          ...exam.toObject(),
          attemptCount,
          status,
          canStart: status === 'available' || status === 'in-progress',
          activeSubmissionId: activeSubmission?._id,
        };
      })
    );

    res.json({
      success: true,
      data: { exams: examsWithStatus },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam details (before starting)
// @route   GET /api/student/exams/:id
// @access  Student
export const getExamDetails = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Only show published/ongoing/completed exams to students
    if (!['published', 'ongoing', 'completed'].includes(exam.status)) {
      throw new AppError('Exam not found', 404);
    }

    // Check if student is allowed (allowedStudents may be excluded by select elsewhere)
    const allowedIds = (exam.allowedStudents || []).map((id) => id.toString());
    if (!exam.allowAllStudents && !allowedIds.includes(req.user._id.toString())) {
      throw new AppError('You are not allowed to take this exam', 403);
    }

    // Get question count
    const questionCount = await Question.countDocuments({ 
      exam: exam._id, 
      isActive: true 
    });

    // Get attempt info
    const attemptCount = await Submission.getAttemptCount(exam._id, req.user._id);
    const activeSubmission = await Submission.getActiveSubmission(exam._id, req.user._id);

    const examObj = exam.toObject();
    delete examObj.allowedStudents; // do not expose to client

    // Compute derived status (same logic as getAvailableExams)
    const now = new Date();
    let computedStatus;
    if (now < exam.startTime) {
      computedStatus = 'upcoming';
    } else if (now > exam.endTime) {
      computedStatus = 'ended';
    } else if (activeSubmission) {
      computedStatus = 'in-progress';
    } else if (attemptCount >= exam.maxAttempts) {
      computedStatus = 'completed';
    } else {
      computedStatus = 'available';
    }

    res.json({
      success: true,
      data: {
        exam: {
          ...examObj,
          questionCount,
          computedStatus,
        },
        attemptCount,
        remainingAttempts: exam.maxAttempts - attemptCount,
        activeSubmissionId: activeSubmission?._id,
        canStart: computedStatus === 'available' || computedStatus === 'in-progress',
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start exam
// @route   POST /api/student/exams/:id/start
// @access  Student
export const startExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Validate exam status (allow published or ongoing)
    if (!['published', 'ongoing'].includes(exam.status)) {
      throw new AppError('Exam is not available', 400);
    }

    const now = new Date();
    // Allow starting if we are within the time window OR if the exam is ongoing (activated)
    if (exam.status === 'published' && now < exam.startTime) {
      throw new AppError('Exam has not started yet', 400);
    }

    if (now > exam.endTime) {
      throw new AppError('Exam has ended', 400);
    }

    // Check for active submission
    let submission = await Submission.getActiveSubmission(exam._id, req.user._id);
    
    if (submission) {
      // Check if this in-progress submission has expired
      if (submission.isTimeUp()) {
        // Auto-submit the expired submission
        submission.status = 'auto-submitted';
        submission.submissionType = 'auto-timeout';
        submission.submittedAt = new Date();
        await submission.save();
        // Fall through to create new attempt or reject
      } else {
        // Resume existing submission
        const questions = await getQuestionsForSubmission(submission);
        const state = await getExamState(submission);

        return res.json({
          success: true,
          message: 'Resuming exam',
          data: {
            submission: formatSubmissionResponse(submission),
            examTitle: exam.title,
            questions,
            state,
          },
        });
      }
    }

    // Check attempt limit
    const attemptCount = await Submission.getAttemptCount(exam._id, req.user._id);
    if (attemptCount >= exam.maxAttempts) {
      throw new AppError('Maximum attempts reached', 400);
    }

    // Get questions
    let questions;
    if (exam.randomizeQuestions) {
      questions = await Question.getRandomizedQuestions(exam._id, exam.randomizeOptions);
    } else {
      questions = await Question.getExamQuestions(exam._id, true);
    }

    // Calculate end time
    const serverEndTime = new Date(Math.min(
      now.getTime() + exam.duration * 60 * 1000,
      exam.endTime.getTime()
    ));

    // Create session ID
    const sessionId = uuidv4();

    // Initialize answers
    const answers = questions.map((q, index) => ({
      question: q._id,
      questionNumber: q.questionNumber || index + 1,
      selectedOptions: [],
      visited: false,
      markedForReview: false,
      answeredAt: null,
      timeTaken: 0,
    }));

    // Create submission
    submission = await Submission.create({
      exam: exam._id,
      student: req.user._id,
      attemptNumber: attemptCount + 1,
      startedAt: now,
      serverEndTime,
      answers,
      questionOrder: questions.map(q => q._id),
      sessionId,
      ipHash: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Store in Redis for fast access
    await storeExamState(submission, questions);

    // Log exam start
    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-start',
      targetType: 'submission',
      targetId: submission._id,
      details: { examId: exam._id, attemptNumber: submission.attemptNumber },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Exam started',
      data: {
        submission: formatSubmissionResponse(submission),
        examTitle: exam.title,
        questions,
        state: {
          currentQuestion: 0,
          remainingTime: Math.floor((serverEndTime - now) / 1000),
          serverTime: now.getTime(),
          submissionAnswers: [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save answer
// @route   POST /api/student/submissions/:id/answer
// @access  Student
export const saveAnswer = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: 'in-progress',
    });

    if (!submission) {
      throw new AppError('Submission not found or already submitted', 404);
    }

    // Check if time is up
    if (submission.isTimeUp()) {
      // Auto-submit
      await autoSubmitExam(submission, 'auto-timeout');
      throw new AppError('Time is up. Exam has been auto-submitted.', 400);
    }

    const { questionId, selectedOptions, markedForReview, timeTaken } = req.body;

    // Update answer in submission
    const answer = submission.answers.find(
      a => a.question.toString() === questionId
    );

    if (!answer) {
      throw new AppError('Question not found in submission', 404);
    }

    answer.selectedOptions = selectedOptions || [];
    answer.markedForReview = markedForReview || false;
    answer.visited = true;
    answer.timeTaken = timeTaken || 0;
    if (selectedOptions && selectedOptions.length > 0) {
      answer.answeredAt = new Date();
    }

    await submission.save();

    // Safe Redis update
    if (redisClient) {
      try {
        await redisClient.updateExamAnswer(submission.sessionId, questionId, {
          selectedOptions,
          markedForReview,
          visited: true,
          timeTaken,
        });
      } catch (e) {
        console.warn('[REDIS] updateExamAnswer failed:', e.message);
      }
    }

    // Log answer save (lightweight)
    await AuditLog.log({
      user: req.user._id,
      action: 'answer-save',
      targetType: 'submission',
      targetId: submission._id,
      details: { questionId },
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Answer saved',
      data: {
        paletteState: submission.paletteState,
        remainingTime: submission.remainingTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk save answers (auto-save)
// @route   POST /api/student/submissions/:id/answers
// @access  Student
export const bulkSaveAnswers = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: 'in-progress',
    });

    if (!submission) {
      throw new AppError('Submission not found or already submitted', 404);
    }

    // Check if time is up
    if (submission.isTimeUp()) {
      await autoSubmitExam(submission, 'auto-timeout');
      throw new AppError('Time is up. Exam has been auto-submitted.', 400);
    }

    const { answers } = req.body;

    for (const answerData of answers) {
      const answer = submission.answers.find(
        a => a.question.toString() === answerData.questionId
      );

      if (answer) {
        answer.selectedOptions = answerData.selectedOptions || [];
        answer.markedForReview = answerData.markedForReview || false;
        answer.visited = true;
        answer.timeTaken = answerData.timeTaken || 0;
        if (answerData.selectedOptions && answerData.selectedOptions.length > 0) {
          answer.answeredAt = new Date();
        }

        // Safe Redis update
        if (redisClient) {
          try {
            await redisClient.updateExamAnswer(submission.sessionId, answerData.questionId, {
              selectedOptions: answerData.selectedOptions,
              markedForReview: answerData.markedForReview,
              visited: true,
              timeTaken: answerData.timeTaken,
            });
          } catch (e) {
            // Ignore Redis errors
          }
        }
      }
    }

    await submission.save();

    res.json({
      success: true,
      message: 'Answers saved',
      data: {
        paletteState: submission.paletteState,
        remainingTime: submission.remainingTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Visit question
// @route   POST /api/student/submissions/:id/visit
// @access  Student
export const visitQuestion = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: 'in-progress',
    });

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const { questionId } = req.body;
    submission.visitQuestion(questionId);
    await submission.save();

    res.json({
      success: true,
      data: { paletteState: submission.paletteState },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit exam
// @route   POST /api/student/submissions/:id/submit
// @access  Student
export const submitExam = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: 'in-progress',
    });

    if (!submission) {
      throw new AppError('Submission not found or already submitted', 404);
    }

    // Calculate time taken
    const timeTaken = Math.floor((Date.now() - submission.startedAt.getTime()) / 1000);

    // Update submission
    submission.status = 'submitted';
    submission.submittedAt = new Date();
    submission.submissionType = req.body.autoSubmit ? 'auto-timeout' : 'manual';
    submission.timeTaken = timeTaken;
    submission.submissionIp = req.ip;
    submission.submissionUserAgent = req.headers['user-agent'];

    // Calculate results
    await submission.calculateResults();
    submission.status = 'evaluated';
    await submission.save();

    // Safe Redis cleanup
    if (redisClient) {
      try {
        await redisClient.deleteExamState(submission.sessionId);
      } catch (e) {
        // Ignore Redis errors
      }
    }

    // Log submission
    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-submit',
      targetType: 'submission',
      targetId: submission._id,
      details: {
        marksObtained: submission.marksObtained,
        totalMarks: submission.totalMarks,
        timeTaken,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      data: {
        submission: {
          id: submission._id,
          status: submission.status,
          marksObtained: submission.marksObtained,
          totalMarks: submission.totalMarks,
          percentage: submission.percentage,
          questionsAttempted: submission.questionsAttempted,
          correctAnswers: submission.correctAnswers,
          wrongAnswers: submission.wrongAnswers,
          timeTaken: submission.timeTaken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get submission status
// @route   GET /api/student/submissions/:id
// @access  Student
export const getSubmissionStatus = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
    }).populate('exam', 'title subject duration allowReview showCorrectAnswers showExplanations reviewAvailableFrom');

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    res.json({
      success: true,
      data: {
        submission: formatSubmissionResponse(submission),
        exam: submission.exam,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam review
// @route   GET /api/student/submissions/:id/review
// @access  Student
export const getExamReview = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      student: req.user._id,
      status: { $in: ['submitted', 'auto-submitted', 'violation-submitted', 'force-submitted', 'evaluated'] },
    }).populate('exam');

    if (!submission) {
      throw new AppError('Submission not found or exam not completed', 404);
    }

    const exam = submission.exam;

    // Check if review is allowed
    if (!exam.allowReview) {
      throw new AppError('Review is not available for this exam', 403);
    }

    if (exam.reviewAvailableFrom && new Date() < exam.reviewAvailableFrom) {
      throw new AppError(`Review will be available after ${exam.reviewAvailableFrom.toISOString()}`, 403);
    }

    // Get questions with/without correct answers based on settings
    const questions = await Question.find({ exam: exam._id })
      .sort({ questionNumber: 1 });

    const reviewData = questions.map(q => {
      const answer = submission.answers.find(
        a => a.question.toString() === q._id.toString()
      );

      const reviewQuestion = exam.showCorrectAnswers 
        ? q.toReviewView(exam.showExplanations)
        : q.toStudentView();

      return {
        ...reviewQuestion,
        studentAnswer: answer?.selectedOptions || [],
        isCorrect: answer?.isCorrect,
        marksObtained: answer?.marksObtained || 0,
        timeTaken: answer?.timeTaken || 0,
      };
    });

    res.json({
      success: true,
      data: {
        submission: formatSubmissionResponse(submission),
        questions: reviewData,
        showCorrectAnswers: exam.showCorrectAnswers,
        showExplanations: exam.showExplanations,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student results
// @route   GET /api/student/results
// @access  Student
export const getStudentResults = async (req, res, next) => {
  try {
    const submissions = await Submission.find({
      student: req.user._id,
      status: { $in: ['submitted', 'auto-submitted', 'violation-submitted', 'force-submitted', 'evaluated'] },
    })
      .populate('exam', 'title subject totalMarks passingMarks allowReview')
      .sort({ submittedAt: -1 });

    const results = submissions
      .filter(s => s.exam) // skip submissions where exam was deleted
      .map(s => ({
      id: s._id,
      examId: s.exam._id,
      examTitle: s.exam.title,
      subject: s.exam.subject,
      marksObtained: s.marksObtained,
      totalMarks: s.totalMarks,
      percentage: s.percentage,
      status: s.marksObtained >= s.exam.passingMarks ? 'passed' : 'failed',
      attemptNumber: s.attemptNumber,
      submittedAt: s.submittedAt,
      reviewAvailable: s.exam.allowReview,
    }));

    res.json({
      success: true,
      data: { results },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single result details
// @route   GET /api/student/results/:resultId
// @access  Student
export const getResultDetails = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.resultId,
      student: req.user._id,
      status: { $in: ['submitted', 'auto-submitted', 'violation-submitted', 'force-submitted', 'evaluated'] },
    }).populate('exam', 'title subject totalMarks passingMarks allowReview showCorrectAnswers showExplanations reviewAvailableFrom duration');

    if (!submission) {
      throw new AppError('Result not found', 404);
    }

    const exam = submission.exam;
    if (!exam) {
      throw new AppError('The exam associated with this result has been removed', 404);
    }

    // Check if review is available
    const now = new Date();
    const canReview = exam.allowReview && 
      (!exam.reviewAvailableFrom || now >= exam.reviewAvailableFrom);

    // Get questions with answers if review is allowed
    let questions = [];
    if (canReview) {
      const examQuestions = await Question.find({ exam: exam._id })
        .sort({ questionNumber: 1 });

      questions = examQuestions.map(q => {
        const answer = submission.answers.find(
          a => a.question.toString() === q._id.toString()
        );

        const questionData = exam.showCorrectAnswers
          ? q.toReviewView(exam.showExplanations)
          : q.toStudentView();

        return {
          ...questionData,
          studentAnswer: answer?.selectedOptions || [],
          isCorrect: answer?.isCorrect,
          marksObtained: answer?.marksObtained || 0,
          maxMarks: q.marks,
          timeTaken: answer?.timeTaken || 0,
          visited: answer?.visited || false,
          markedForReview: answer?.markedForReview || false,
        };
      });
    }

    // Build response
    const result = {
      id: submission._id,
      examId: exam._id,
      examTitle: exam.title,
      subject: exam.subject,
      duration: exam.duration,
      marksObtained: submission.marksObtained,
      totalMarks: submission.totalMarks,
      percentage: submission.percentage,
      passingMarks: exam.passingMarks,
      passed: submission.marksObtained >= exam.passingMarks,
      attemptNumber: submission.attemptNumber,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      timeTaken: submission.timeTaken,
      questionsAttempted: submission.questionsAttempted,
      correctAnswers: submission.correctAnswers,
      wrongAnswers: submission.wrongAnswers,
      totalViolations: submission.totalViolations,
      submissionType: submission.submissionType,
      canReview,
      showCorrectAnswers: exam.showCorrectAnswers,
      showExplanations: exam.showExplanations,
    };

    res.json({
      success: true,
      data: {
        result,
        questions: canReview ? questions : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
async function getQuestionsForSubmission(submission) {
  const questions = await Question.find({
    _id: { $in: submission.questionOrder },
    isActive: true,
  });

  // Maintain order
  const orderMap = new Map(submission.questionOrder.map((id, i) => [id.toString(), i]));
  questions.sort((a, b) => orderMap.get(a._id.toString()) - orderMap.get(b._id.toString()));

  return questions.map(q => q.toStudentView());
}

async function getExamState(submission) {
  let cachedAnswers = {};
  if (redisClient) {
    try {
      cachedAnswers = await redisClient.getExamAnswers(submission.sessionId);
    } catch (e) {
      // Ignore Redis errors
    }
  }

  // Always include submission answers as fallback (Redis may not be available)
  const submissionAnswers = submission.answers.map(a => ({
    questionId: a.question.toString(),
    selectedOptions: (a.selectedOptions || []).map(id => id.toString()),
    markedForReview: a.markedForReview || false,
    visited: a.visited || false,
    timeTaken: a.timeTaken || 0,
  }));
  
  return {
    currentQuestion: 0,
    remainingTime: submission.remainingTime,
    serverTime: Date.now(),
    answers: cachedAnswers,
    submissionAnswers,
  };
}

async function storeExamState(submission, questions) {
  if (!redisClient) return; // Skip if Redis not available
  try {
    await redisClient.setExamState(submission.sessionId, {
      submissionId: submission._id.toString(),
      studentId: submission.student.toString(),
      examId: submission.exam.toString(),
      startedAt: submission.startedAt.toISOString(),
      serverEndTime: submission.serverEndTime.toISOString(),
      questionCount: questions.length,
    });
  } catch (e) {
    console.warn('[REDIS] storeExamState failed:', e.message);
  }
}

async function autoSubmitExam(submission, type = 'auto-timeout') {
  const timeTaken = Math.floor((Date.now() - submission.startedAt.getTime()) / 1000);

  submission.status = type === 'auto-timeout' ? 'auto-submitted' : 'violation-submitted';
  submission.submittedAt = new Date();
  submission.submissionType = type;
  submission.timeTaken = timeTaken;

  await submission.calculateResults();
  await submission.save();

  // Safe Redis cleanup
  if (redisClient) {
    try {
      await redisClient.deleteExamState(submission.sessionId);
    } catch (e) {
      console.warn('[REDIS] deleteExamState failed:', e.message);
    }
  }

  await AuditLog.log({
    user: submission.student,
    action: 'exam-auto-submit',
    targetType: 'submission',
    targetId: submission._id,
    details: { type, marksObtained: submission.marksObtained },
    status: 'success',
  });
}

function formatSubmissionResponse(submission) {
  return {
    id: submission._id,
    examId: submission.exam?._id || submission.exam,
    attemptNumber: submission.attemptNumber,
    startedAt: submission.startedAt,
    serverEndTime: submission.serverEndTime,
    submittedAt: submission.submittedAt,
    status: submission.status,
    remainingTime: submission.remainingTime,
    paletteState: submission.paletteState,
    marksObtained: submission.marksObtained,
    totalMarks: submission.totalMarks,
    percentage: submission.percentage,
    questionsAttempted: submission.questionsAttempted,
    correctAnswers: submission.correctAnswers,
    wrongAnswers: submission.wrongAnswers,
    totalViolations: submission.totalViolations,
  };
}

export { autoSubmitExam };

export default {
  getAvailableExams,
  getExamDetails,
  startExam,
  saveAnswer,
  bulkSaveAnswers,
  visitQuestion,
  submitExam,
  getSubmissionStatus,
  getExamReview,
  getStudentResults,
  getResultDetails,
};
