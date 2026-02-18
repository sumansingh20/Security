import { Exam, Question, Submission, Violation, User, AuditLog } from '../models/index.js';
import AppError from '../utils/AppError.js';

// @desc    Create new exam
// @route   POST /api/admin/exams
// @access  Admin
export const createExam = async (req, res, next) => {
  try {
    const examData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const exam = await Exam.create(examData);

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-create',
      targetType: 'exam',
      targetId: exam._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: { exam },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all exams
// @route   GET /api/admin/exams
// @access  Admin
export const getExams = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, subject, sort = '-createdAt' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (subject) query.subject = new RegExp(subject, 'i');

    const exams = await Exam.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('questionsCount')
      .populate('submissionsCount')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Exam.countDocuments(query);

    res.json({
      success: true,
      data: {
        exams,
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

// @desc    Get exam by ID
// @route   GET /api/admin/exams/:id
// @access  Admin
export const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('questionsCount')
      .populate('submissionsCount');

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Get questions
    const questions = await Question.find({ exam: exam._id })
      .sort({ questionNumber: 1 });

    res.json({
      success: true,
      data: {
        exam,
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update exam
// @route   PUT /api/admin/exams/:id
// @access  Admin
export const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Only allow editing draft exams
    if (exam.status !== 'draft') {
      throw new AppError(`Cannot edit exam with status: ${exam.status}. Only draft exams can be edited.`, 400);
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-update',
      targetType: 'exam',
      targetId: exam._id,
      details: { changes: req.body },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: { exam: updatedExam },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete exam
// @route   DELETE /api/admin/exams/:id
// @access  Admin
export const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Don't delete exams with submissions
    const submissionCount = await Submission.countDocuments({ exam: exam._id });
    if (submissionCount > 0) {
      throw new AppError('Cannot delete exam with existing submissions. Archive it instead.', 400);
    }

    // Delete associated questions
    await Question.deleteMany({ exam: exam._id });

    // Delete exam
    await exam.deleteOne();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-delete',
      targetType: 'exam',
      targetId: exam._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish exam
// @route   PUT /api/admin/exams/:id/publish
// @access  Admin
export const publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Check if exam has questions
    const questionCount = await Question.countDocuments({ exam: exam._id, isActive: true });
    if (questionCount === 0) {
      throw new AppError('Cannot publish exam without questions', 400);
    }

    // Calculate total marks
    const questions = await Question.find({ exam: exam._id, isActive: true });
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    exam.status = 'published';
    exam.totalMarks = totalMarks;
    await exam.save();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-publish',
      targetType: 'exam',
      targetId: exam._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam published successfully',
      data: { exam },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive exam
// @route   PUT /api/admin/exams/:id/archive
// @access  Admin
export const archiveExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (!['completed', 'archived'].includes(exam.status)) {
      throw new AppError(`Cannot archive exam with status: ${exam.status}. Must be completed first.`, 400);
    }

    exam.status = 'archived';
    exam.archivedAt = new Date();
    exam.archivedBy = req.user._id;
    await exam.save();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'exam-archive',
      targetType: 'exam',
      targetId: exam._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Exam archived successfully',
      data: { exam },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam submissions
// @route   GET /api/admin/exams/:id/submissions
// @access  Admin
export const getExamSubmissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const exam = await Exam.findById(req.params.id).select('title subject totalMarks passingMarks duration status').lean();

    const submissions = await Submission.find({ exam: req.params.id })
      .populate('student', 'firstName lastName email studentId')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments({ exam: req.params.id });

    // Get violation summary
    const violationSummary = await Violation.getExamViolationSummary(req.params.id);

    res.json({
      success: true,
      data: {
        exam: exam || null,
        submissions,
        violationSummary,
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

// @desc    Get exam analytics
// @route   GET /api/admin/exams/:id/analytics
// @access  Admin
export const getExamAnalytics = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    // Get all completed submissions
    const submissions = await Submission.find({
      exam: req.params.id,
      status: { $in: ['submitted', 'auto-submitted', 'violation-submitted', 'evaluated'] },
    });

    // Calculate statistics
    const stats = {
      totalSubmissions: submissions.length,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      averageTime: 0,
      passRate: 0,
      scoreDistribution: {},
      questionAnalysis: [],
    };

    if (submissions.length > 0) {
      const scores = submissions.map(s => s.marksObtained);
      const times = submissions.map(s => s.timeTaken);
      const passed = submissions.filter(s => s.marksObtained >= exam.passingMarks).length;

      stats.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      stats.highestScore = Math.max(...scores);
      stats.lowestScore = Math.min(...scores);
      stats.averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      stats.passRate = (passed / submissions.length) * 100;

      // Score distribution (0-10, 10-20, etc.)
      const distribution = {};
      scores.forEach(score => {
        const bucket = Math.floor(score / 10) * 10;
        const key = `${bucket}-${bucket + 10}`;
        distribution[key] = (distribution[key] || 0) + 1;
      });
      stats.scoreDistribution = distribution;
    }

    // Question-wise analysis
    const questions = await Question.find({ exam: req.params.id, isActive: true });
    
    for (const question of questions) {
      let correct = 0;
      let attempted = 0;

      for (const submission of submissions) {
        const answer = submission.answers.find(
          a => a.question.toString() === question._id.toString()
        );
        if (answer && answer.selectedOptions.length > 0) {
          attempted++;
          if (answer.isCorrect) correct++;
        }
      }

      stats.questionAnalysis.push({
        questionId: question._id,
        questionNumber: question.questionNumber,
        questionText: question.questionText.substring(0, 100),
        attempted,
        correct,
        accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
      });
    }

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export exam results
// @route   GET /api/admin/exams/:id/export
// @access  Admin
export const exportExamResults = async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;

    const submissions = await Submission.find({ exam: req.params.id })
      .populate('student', 'firstName lastName email studentId department batch')
      .populate('exam', 'title subject totalMarks passingMarks')
      .sort({ marksObtained: -1 });

    const data = submissions.map((s, index) => ({
      rank: index + 1,
      studentId: s.student?.studentId || 'N/A',
      name: s.student ? `${s.student.firstName} ${s.student.lastName}` : 'N/A',
      email: s.student?.email || 'N/A',
      department: s.student?.department || 'N/A',
      batch: s.student?.batch || 'N/A',
      marksObtained: s.marksObtained,
      totalMarks: s.totalMarks,
      percentage: (s.percentage || 0).toFixed(2),
      questionsAttempted: s.questionsAttempted,
      correctAnswers: s.correctAnswers,
      wrongAnswers: s.wrongAnswers,
      unattempted: s.unattempted,
      timeTaken: Math.round(s.timeTaken / 60), // minutes
      violations: s.totalViolations,
      status: s.status,
      submittedAt: s.submittedAt?.toISOString() || 'N/A',
    }));

    if (format === 'json') {
      return res.json({
        success: true,
        data: { results: data },
      });
    }

    // CSV format
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=exam-results-${req.params.id}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Admin
export const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Helper: wrap each query with a per-query timeout (8 seconds)
    const safeQuery = (promise) =>
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 8000)),
      ]).catch(() => null);

    // Run all queries in parallel with individual error handling
    const [totalExams, activeExams, publishedExams, totalStudents, totalSubmissions, recentViolations, recentExams, recentSubmissions, totalTeachers, onlineStudents] = await Promise.all([
      safeQuery(Exam.countDocuments()),
      safeQuery(Exam.countDocuments({
        status: { $in: ['ongoing', 'published'] },
        startTime: { $lte: now },
        endTime: { $gte: now },
      })),
      safeQuery(Exam.countDocuments({ status: 'published' })),
      safeQuery(User.countDocuments({ role: 'student' })),
      safeQuery(Submission.countDocuments()),
      safeQuery(Violation.countDocuments({ createdAt: { $gte: last24Hours } })),
      safeQuery(Exam.find().sort({ createdAt: -1 }).limit(10).select('title subject status startTime endTime').lean()),
      safeQuery(
        Submission.find()
          .sort({ submittedAt: -1 })
          .limit(10)
          .populate('student', 'firstName lastName')
          .populate('exam', 'title')
          .select('marksObtained totalMarks status submittedAt')
          .lean()
      ),
      safeQuery(User.countDocuments({ role: 'teacher' })),
      safeQuery(User.countDocuments({ role: 'student', isOnline: true })),
    ]);

    // Calculate average score safely
    let averageScore = 0;
    const scored = (recentSubmissions || []).filter(s => s && s.totalMarks > 0);
    if (scored.length > 0) {
      averageScore = Math.round(
        scored.reduce((sum, s) => sum + ((s.marksObtained / s.totalMarks) * 100), 0) / scored.length
      );
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalExams: totalExams || 0,
          activeExams: activeExams || 0,
          publishedExams: publishedExams || 0,
          totalStudents: totalStudents || 0,
          totalTeachers: totalTeachers || 0,
          totalSubmissions: totalSubmissions || 0,
          recentViolations: recentViolations || 0,
          onlineStudents: onlineStudents || 0,
          averageScore,
        },
        recentExams: (recentExams || []).map(exam => ({
          _id: exam._id,
          title: exam.title || 'Untitled',
          subject: exam.subject || '',
          status: exam.status || 'draft',
          startTime: exam.startTime,
          endTime: exam.endTime,
          submissionCount: 0,
        })),
        recentSubmissions: (recentSubmissions || []).map(s => ({
          _id: s._id,
          student: s.student ? { firstName: s.student.firstName, lastName: s.student.lastName } : null,
          exam: s.exam ? { title: s.exam.title } : null,
          marksObtained: s.marksObtained || 0,
          totalMarks: s.totalMarks || 0,
          status: s.status,
          submittedAt: s.submittedAt,
        })),
        serverTime: now.toISOString(),
      },
    });
  } catch (error) {
    // Even if everything fails, return minimal data instead of 500
    try {
      return res.json({
        success: true,
        data: {
          stats: { totalExams: 0, activeExams: 0, publishedExams: 0, totalStudents: 0, totalTeachers: 0, totalSubmissions: 0, recentViolations: 0, onlineStudents: 0, averageScore: 0 },
          recentExams: [],
          recentSubmissions: [],
          serverTime: new Date().toISOString(),
        },
      });
    } catch (e) {
      next(error);
    }
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, sort = '-createdAt', inactive } = req.query;

    const query = {};
    if (role) query.role = role;
    if (inactive) {
      const days = parseInt(inactive) || 30;
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      query.$or = [
        { lastLogin: { $lt: threshold } },
        { lastLogin: { $exists: false } },
        { lastLogin: null },
      ];
    }
    if (search) {
      const searchOr = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { studentId: new RegExp(search, 'i') },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
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

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Admin
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/admin/users
// @access  Admin
export const createUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, studentId, employeeId, dateOfBirth, rollNumber, section, semester, department, batch, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    // Check studentId uniqueness if provided
    if (studentId) {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        throw new AppError('A user with this Student ID already exists', 400);
      }
    }

    // Check employeeId uniqueness if provided
    if (employeeId) {
      const existingEmployee = await User.findOne({ employeeId });
      if (existingEmployee) {
        throw new AppError('A user with this Employee ID already exists', 400);
      }
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'student',
      studentId: studentId || undefined,
      employeeId: employeeId || undefined,
      dateOfBirth: dateOfBirth || undefined,
      rollNumber: rollNumber || undefined,
      section: section || undefined,
      semester: semester ? Number(semester) : undefined,
      department: department || undefined,
      batch: batch || undefined,
      phone: phone || undefined,
      isActive: true,
      isVerified: true,
    });

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'user-create',
      targetType: 'user',
      targetId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: { ...user.toObject(), password: undefined } },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Admin
export const updateUser = async (req, res, next) => {
  try {
    const { password, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update password separately if provided
    if (password) {
      const userWithPassword = await User.findById(req.params.id);
      userWithPassword.password = password;
      await userWithPassword.save();
    }

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'user-update',
      targetType: 'user',
      targetId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Soft delete - deactivate instead of removing
    user.isActive = false;
    await user.save();

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'user-delete',
      targetType: 'user',
      targetId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk import users
// @route   POST /api/admin/users/bulk
// @access  Admin
export const bulkImportUsers = async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      throw new AppError('Please provide an array of users', 400);
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [],
    };

    for (const userData of users) {
      try {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          results.errors.push({ email: userData.email, error: 'Already exists' });
          results.failed++;
          continue;
        }

        await User.create({
          ...userData,
          isActive: true,
          isVerified: true,
        });
        results.created++;
      } catch (err) {
        results.errors.push({ email: userData.email, error: err.message });
        results.failed++;
      }
    }

    res.json({
      success: true,
      message: `Created ${results.created} users, ${results.failed} failed`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get submission by ID (detailed view)
// @route   GET /api/admin/submissions/:submissionId
// @access  Admin
export const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.submissionId)
      .populate('student', 'firstName lastName email studentId rollNumber')
      .populate('exam', 'title subject totalMarks passingMarks status showCorrectAnswers showExplanations showMarks');

    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    // Get questions with answers
    const questions = await Question.find({ exam: submission.exam._id }).sort({ questionNumber: 1 });
    
    // Get violations for this submission
    const violations = await Violation.find({ submission: submission._id }).sort({ timestamp: 1 });

    // Build detailed answer data
    const answersWithQuestions = submission.answers.map((answer) => {
      const question = questions.find((q) => q._id.toString() === answer.question?.toString());
      return {
        questionId: answer.question,
        question: question ? {
          _id: question._id,
          questionText: question.questionText,
          questionType: question.questionType,
          marks: question.marks,
          options: question.options,
          correctAnswer: question.correctOptions,
          explanation: question.explanation,
          imageUrl: question.imageUrl,
        } : null,
        selectedOptions: answer.selectedOptions,
        numericalAnswer: answer.numericalAnswer,
        textAnswer: answer.textAnswer,
        isCorrect: answer.isCorrect,
        marksObtained: answer.marksObtained || 0,
        isFlagged: answer.markedForReview,
      };
    });

    const responseData = {
      _id: submission._id,
      exam: submission.exam,
      student: {
        _id: submission.student._id,
        name: `${submission.student.firstName} ${submission.student.lastName}`,
        email: submission.student.email,
        rollNumber: submission.student.rollNumber || submission.student.studentId,
      },
      answers: answersWithQuestions,
      score: submission.marksObtained,
      percentage: submission.percentage,
      status: submission.status,
      startTime: submission.startedAt,
      submitTime: submission.submittedAt,
      timeSpent: submission.timeTaken,
      violations: violations.map((v) => ({
        type: v.type,
        timestamp: v.timestamp,
        details: v.description,
      })),
      isPassed: submission.marksObtained >= (submission.exam.passingMarks || 0),
      attemptNumber: submission.attemptNumber || 1,
    };

    res.json({
      success: true,
      data: { submission: responseData },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all results across exams
// @route   GET /api/admin/results
// @access  Admin
export const getAllResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, exam } = req.query;
    const query = {};
    if (status) query.status = status;
    if (exam) query.exam = exam;

    const submissions = await Submission.find(query)
      .populate('student', 'firstName lastName email studentId rollNumber')
      .populate('exam', 'title subject totalMarks passingMarks')
      .sort('-submittedAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments(query);

    const results = submissions.map((s) => ({
      _id: s._id,
      exam: s.exam,
      student: s.student,
      score: s.marksObtained,
      marksObtained: s.marksObtained,
      totalMarks: s.exam?.totalMarks || 0,
      percentage: s.percentage,
      passed: s.marksObtained >= (s.exam?.passingMarks || 0),
      submittedAt: s.submittedAt,
      gradedAt: s.gradedAt,
      status: s.status,
      totalViolations: s.totalViolations || 0,
    }));

    res.json({ success: true, data: { results, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all submissions listing
// @route   GET /api/admin/submissions
// @access  Admin
export const getAllSubmissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, exam } = req.query;
    const query = {};
    if (status) query.status = status;
    if (exam) query.exam = exam;

    const submissions = await Submission.find(query)
      .populate('student', 'firstName lastName email studentId')
      .populate('exam', 'title subject totalMarks')
      .sort('-submittedAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments(query);

    const formatted = submissions.map((s) => ({
      _id: s._id,
      studentName: s.student ? `${s.student.firstName} ${s.student.lastName}` : 'Unknown',
      examTitle: s.exam?.title || 'Unknown',
      status: s.status,
      submissionType: s.submissionType || 'manual',
      score: s.marksObtained,
      totalMarks: s.exam?.totalMarks || 0,
      submittedAt: s.submittedAt,
      timeSpent: s.timeTaken,
    }));

    res.json({ success: true, data: { submissions: formatted, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all violations across exams
// @route   GET /api/admin/violations
// @access  Admin
export const getAllViolations = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, severity } = req.query;
    const query = {};
    if (type) query.type = type;
    if (severity) query.severity = severity;

    const violations = await Violation.find(query)
      .populate('student', 'firstName lastName email')
      .populate('exam', 'title')
      .sort('-timestamp')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Violation.countDocuments(query);

    const formatted = violations.map((v) => ({
      _id: v._id,
      studentName: v.student ? `${v.student.firstName} ${v.student.lastName}` : 'Unknown',
      studentEmail: v.student?.email,
      examTitle: v.exam?.title || 'Unknown',
      type: v.type,
      severity: v.severity || 'medium',
      timestamp: v.timestamp,
      details: v.description,
      resolved: v.resolved || false,
    }));

    res.json({ success: true, data: { violations: formatted, total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get online/recently active users
// @route   GET /api/admin/users/online
// @access  Admin
export const getOnlineUsers = async (req, res, next) => {
  try {
    // Consider users active if they've been active in the last 15 minutes
    const threshold = new Date(Date.now() - 15 * 60 * 1000);
    const users = await User.find({ lastLogin: { $gte: threshold }, isActive: true })
      .select('firstName lastName email role lastLogin')
      .sort('-lastLogin')
      .limit(100);

    const formatted = users.map((u) => ({
      _id: u._id,
      name: `${u.firstName} ${u.lastName}`,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      lastActive: u.lastLogin,
    }));

    res.json({ success: true, data: { users: formatted } });
  } catch (error) {
    next(error);
  }
};

// @desc    Grade a submission (update answer marks)
// @route   PUT /api/admin/submissions/:submissionId/grade
// @access  Admin
export const gradeSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) throw new AppError('Submission not found', 404);

    const { answers, feedback } = req.body;
    if (Array.isArray(answers)) {
      for (const ans of answers) {
        const existing = submission.answers.find((a) => a.question?.toString() === ans.questionId);
        if (existing) {
          existing.marksObtained = ans.marks;
          existing.isCorrect = ans.marks > 0;
        }
      }
      submission.marksObtained = submission.answers.reduce((sum, a) => sum + (a.marksObtained || 0), 0);
    }
    if (feedback) submission.feedback = feedback;
    submission.status = 'evaluated';
    await submission.save();

    res.json({ success: true, message: 'Submission graded successfully', data: { submission } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get result summaries per exam (report)
// @route   GET /api/admin/reports/results
// @access  Admin
export const getReportResults = async (req, res, next) => {
  try {
    const exams = await Exam.find().select('title subject').lean();
    const data = [];
    for (const exam of exams) {
      const submissions = await Submission.find({ exam: exam._id }).lean();
      if (submissions.length === 0) continue;
      const scores = submissions.map((s) => s.marksObtained || 0);
      const passed = submissions.filter((s) => s.marksObtained >= (exam.passingMarks || 0)).length;
      data.push({
        _id: exam._id,
        examTitle: exam.title,
        totalSubmissions: submissions.length,
        passed,
        failed: submissions.length - passed,
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
      });
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam statistics (report)
// @route   GET /api/admin/reports/exam-stats
// @access  Admin
export const getReportExamStats = async (req, res, next) => {
  try {
    const exams = await Exam.find().select('title subject').lean();
    const data = [];
    for (const exam of exams) {
      const submissions = await Submission.find({ exam: exam._id }).lean();
      const scores = submissions.map((s) => s.percentage || 0);
      const timeSpent = submissions.map((s) => s.timeTaken || 0);
      const passed = submissions.filter((s) => s.marksObtained >= (exam.passingMarks || 0)).length;
      data.push({
        _id: exam._id,
        title: exam.title,
        subject: exam.subject,
        totalStudents: submissions.length,
        totalSubmissions: submissions.length,
        avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100 : 0,
        passRate: submissions.length ? Math.round((passed / submissions.length) * 100) : 0,
        avgTimeSpent: timeSpent.length ? Math.round(timeSpent.reduce((a, b) => a + b, 0) / timeSpent.length) : 0,
      });
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export default {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  publishExam,
  archiveExam,
  getExamSubmissions,
  getExamAnalytics,
  exportExamResults,
  getDashboardStats,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  bulkImportUsers,
  getSubmissionById,
  getAllResults,
  getAllSubmissions,
  getAllViolations,
  getOnlineUsers,
  gradeSubmission,
  getReportResults,
  getReportExamStats,
};
