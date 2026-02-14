import { Question, Exam, AuditLog } from '../models/index.js';
import AppError from '../utils/AppError.js';
import mongoose from 'mongoose';

// @desc    Add question to exam
// @route   POST /api/admin/exams/:examId/questions
// @access  Admin
export const createQuestion = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'draft') {
      throw new AppError('Cannot add questions to a published exam', 400);
    }

    // Get next question number
    const lastQuestion = await Question.findOne({ exam: exam._id })
      .sort({ questionNumber: -1 });
    const questionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

    // Process options and correct answers
    const { options, correctOptions, ...rest } = req.body;
    
    // Create option objects with IDs
    const processedOptions = options.map(opt => ({
      _id: new mongoose.Types.ObjectId(),
      text: opt.text,
      imageUrl: opt.imageUrl || null,
    }));

    // Map correctOptions indices to option IDs
    const correctOptionIds = correctOptions.map(index => processedOptions[index]._id);

    const question = await Question.create({
      ...rest,
      exam: exam._id,
      questionNumber,
      options: processedOptions,
      correctOptions: correctOptionIds,
      createdBy: req.user._id,
    });

    // Update exam total marks
    await updateExamTotalMarks(exam._id);

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'question-create',
      targetType: 'question',
      targetId: question._id,
      details: { examId: exam._id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all questions for exam
// @route   GET /api/admin/exams/:examId/questions
// @access  Admin
export const getQuestions = async (req, res, next) => {
  try {
    const questions = await Question.find({ exam: req.params.examId })
      .sort({ questionNumber: 1 });

    res.json({
      success: true,
      data: { questions },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get question by ID
// @route   GET /api/admin/questions/:id
// @access  Admin
export const getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('exam', 'title status');

    if (!question) {
      throw new AppError('Question not found', 404);
    }

    res.json({
      success: true,
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update question
// @route   PUT /api/admin/questions/:id
// @access  Admin
export const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate('exam');

    if (!question) {
      throw new AppError('Question not found', 404);
    }

    if (question.exam.status !== 'draft') {
      throw new AppError('Cannot edit questions of a published exam', 400);
    }

    const { options, correctOptions, ...rest } = req.body;

    // If options are being updated
    if (options) {
      question.options = options.map(opt => ({
        _id: opt._id || new mongoose.Types.ObjectId(),
        text: opt.text,
        imageUrl: opt.imageUrl || null,
      }));
    }

    // If correct options are being updated (as array of option IDs)
    if (correctOptions) {
      question.correctOptions = correctOptions;
    }

    // Update other fields
    Object.assign(question, rest);
    await question.save();

    // Update exam total marks
    await updateExamTotalMarks(question.exam._id);

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'question-update',
      targetType: 'question',
      targetId: question._id,
      details: { changes: req.body },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete question
// @route   DELETE /api/admin/questions/:id
// @access  Admin
export const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate('exam');

    if (!question) {
      throw new AppError('Question not found', 404);
    }

    if (question.exam.status !== 'draft') {
      throw new AppError('Cannot delete questions from a published exam', 400);
    }

    const examId = question.exam._id;
    await question.deleteOne();

    // Renumber remaining questions
    await renumberQuestions(examId);

    // Update exam total marks
    await updateExamTotalMarks(examId);

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'question-delete',
      targetType: 'question',
      targetId: req.params.id,
      details: { examId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk create questions
// @route   POST /api/admin/exams/:examId/questions/bulk
// @access  Admin
export const bulkCreateQuestions = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'draft') {
      throw new AppError('Cannot add questions to a published exam', 400);
    }

    const { questions } = req.body;

    // Get starting question number
    const lastQuestion = await Question.findOne({ exam: exam._id })
      .sort({ questionNumber: -1 });
    let questionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

    const createdQuestions = [];

    for (const q of questions) {
      const { options, correctOptions, ...rest } = q;

      // Create option objects with IDs
      const processedOptions = options.map(opt => ({
        _id: new mongoose.Types.ObjectId(),
        text: opt.text,
        imageUrl: opt.imageUrl || null,
      }));

      // Map correctOptions indices to option IDs
      const correctOptionIds = correctOptions.map(index => processedOptions[index]._id);

      const question = await Question.create({
        ...rest,
        exam: exam._id,
        questionNumber: questionNumber++,
        options: processedOptions,
        correctOptions: correctOptionIds,
        createdBy: req.user._id,
      });

      createdQuestions.push(question);
    }

    // Update exam total marks
    await updateExamTotalMarks(exam._id);

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions added successfully`,
      data: { questions: createdQuestions },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder questions
// @route   PUT /api/admin/exams/:examId/questions/reorder
// @access  Admin
export const reorderQuestions = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'draft') {
      throw new AppError('Cannot reorder questions of a published exam', 400);
    }

    const { order } = req.body; // Array of question IDs in new order

    // Update question numbers based on new order
    for (let i = 0; i < order.length; i++) {
      await Question.findByIdAndUpdate(order[i], { questionNumber: i + 1 });
    }

    const questions = await Question.find({ exam: exam._id })
      .sort({ questionNumber: 1 });

    res.json({
      success: true,
      message: 'Questions reordered successfully',
      data: { questions },
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to renumber questions
async function renumberQuestions(examId) {
  const questions = await Question.find({ exam: examId })
    .sort({ questionNumber: 1 });

  for (let i = 0; i < questions.length; i++) {
    questions[i].questionNumber = i + 1;
    await questions[i].save();
  }
}

// Helper function to update exam total marks
async function updateExamTotalMarks(examId) {
  const questions = await Question.find({ exam: examId, isActive: true });
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  await Exam.findByIdAndUpdate(examId, { totalMarks });
}

export default {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  bulkCreateQuestions,
  reorderQuestions,
};
