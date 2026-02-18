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

    const { options, correctOptions, questionType, ...rest } = req.body;
    
    let processedOptions = [];
    let correctOptionIds = [];

    // Process based on question type
    if (['mcq-single', 'mcq-multiple', 'true-false'].includes(questionType)) {
      // Create option objects with IDs for MCQ types
      if (options && options.length > 0) {
        processedOptions = options.map(opt => ({
          _id: new mongoose.Types.ObjectId(),
          text: opt.text || '',
          imageUrl: opt.imageUrl || null,
          isCorrect: opt.isCorrect || false,
        }));

        // Map correctOptions indices to option IDs if provided as indices
        if (correctOptions && correctOptions.length > 0) {
          if (typeof correctOptions[0] === 'number') {
            correctOptionIds = correctOptions.map(index => processedOptions[index]?._id).filter(Boolean);
          } else {
            // Already ObjectIds or strings
            correctOptionIds = correctOptions;
          }
        } else {
          // Get from isCorrect flags
          correctOptionIds = processedOptions.filter(opt => opt.isCorrect).map(opt => opt._id);
        }
      }
    }

    const questionData = {
      ...rest,
      questionType: questionType || 'mcq-single',
      exam: exam._id,
      questionNumber,
      createdBy: req.user._id,
    };

    // Add options for MCQ types
    if (processedOptions.length > 0) {
      questionData.options = processedOptions;
      questionData.correctOptions = correctOptionIds;
    }

    const question = await Question.create(questionData);

    // Update exam total marks
    await updateExamTotalMarks(exam._id);

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'question-create',
      targetType: 'question',
      targetId: question._id,
      details: { examId: exam._id, questionType },
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

// @desc    Get all questions (global question bank)
// @route   GET /api/teacher/questions
// @access  Admin/Teacher
export const getAllQuestions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, subject, category, type, difficulty, search } = req.query;
    
    const query = { isActive: true };
    
    if (subject) query.subject = subject;
    if (category) query.category = category;
    if (type) query.questionType = type;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.questionText = { $regex: search, $options: 'i' };
    }

    const questions = await Question.find(query)
      .populate('exam', 'title subject')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      data: {
        questions,
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

// @desc    Generate questions using templates (no AI API needed)
// @route   POST /api/admin/exams/:examId/questions/generate
// @access  Admin
export const generateQuestions = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'draft') {
      throw new AppError('Cannot add questions to a published exam', 400);
    }

    const { 
      topic, 
      subject, 
      questionType = 'mcq-single', 
      difficulty = 'mixed',
      count = 5,
      context = ''
    } = req.body;

    // Get starting question number
    const lastQuestion = await Question.findOne({ exam: exam._id })
      .sort({ questionNumber: -1 });
    let questionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

    // Generate questions using template-based approach
    const generatedQuestions = generateTemplateQuestions({
      topic,
      subject,
      questionType,
      difficulty,
      count,
      context
    });

    const createdQuestions = [];

    for (const q of generatedQuestions) {
      let processedOptions = [];
      let correctOptionIds = [];

      if (['mcq-single', 'mcq-multiple', 'true-false'].includes(q.questionType)) {
        processedOptions = q.options.map(opt => ({
          _id: new mongoose.Types.ObjectId(),
          text: opt.text,
          imageUrl: null,
          isCorrect: opt.isCorrect,
        }));
        correctOptionIds = processedOptions.filter(opt => opt.isCorrect).map(opt => opt._id);
      }

      const questionData = {
        exam: exam._id,
        questionNumber: questionNumber++,
        questionText: q.questionText,
        questionType: q.questionType,
        difficulty: q.difficulty,
        marks: q.marks || 1,
        explanation: q.explanation || '',
        generatedByAI: true,
        aiSource: 'template-generator',
        createdBy: req.user._id,
      };

      if (processedOptions.length > 0) {
        questionData.options = processedOptions;
        questionData.correctOptions = correctOptionIds;
      }

      if (q.correctAnswer) {
        questionData.correctAnswer = q.correctAnswer;
      }

      if (q.blanks) {
        questionData.blanks = q.blanks;
      }

      if (q.matchPairs) {
        questionData.matchPairs = q.matchPairs;
      }

      if (q.orderItems) {
        questionData.orderItems = q.orderItems;
      }

      if (q.codeLanguage) {
        questionData.codeLanguage = q.codeLanguage;
      }

      if (q.answerTolerance !== undefined) {
        questionData.answerTolerance = q.answerTolerance;
      }

      const question = await Question.create(questionData);
      createdQuestions.push(question);
    }

    // Update exam total marks
    await updateExamTotalMarks(exam._id);

    await AuditLog.log({
      user: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'questions-generate',
      targetType: 'exam',
      targetId: exam._id,
      details: { count: createdQuestions.length, topic, questionType },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions generated successfully`,
      data: { questions: createdQuestions },
    });
  } catch (error) {
    next(error);
  }
};

// Template-based question generator with rich, varied content
function generateTemplateQuestions({ topic, subject, questionType, difficulty, count, context }) {
  const questions = [];
  const difficulties = difficulty === 'mixed' ? ['easy', 'medium', 'hard'] : [difficulty];
  const ctx = context || subject || 'this subject';
  const t = topic || 'the topic';

  // Shuffle helper
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Rich question bank per type
  const questionBanks = {
    'mcq-single': [
      {
        q: `Which of the following best describes the concept of "${t}" in ${ctx}?`,
        opts: [
          { text: `It is a fundamental principle that governs how ${t} operates within ${ctx}`, correct: true },
          { text: `It is an outdated theory no longer used in modern ${ctx}`, correct: false },
          { text: `It only applies to advanced scenarios and has no basic applications`, correct: false },
          { text: `It is a mathematical formula used exclusively for calculations`, correct: false },
        ],
        explanation: `"${t}" is a core concept in ${ctx} that provides the foundation for understanding related principles.`,
      },
      {
        q: `What is the primary purpose of ${t}?`,
        opts: [
          { text: `To provide a systematic approach to solving problems related to ${ctx}`, correct: true },
          { text: `To replace all other methods in ${ctx}`, correct: false },
          { text: `To create additional complexity in ${ctx}`, correct: false },
          { text: `It serves no practical purpose`, correct: false },
        ],
        explanation: `The primary purpose of ${t} is to provide a structured methodology for addressing challenges in ${ctx}.`,
      },
      {
        q: `Which characteristic is most commonly associated with ${t}?`,
        opts: [
          { text: `Reliability and consistency in ${ctx} applications`, correct: true },
          { text: `Unpredictable results in all scenarios`, correct: false },
          { text: `Limited applicability to only one domain`, correct: false },
          { text: `Dependency on external factors unrelated to ${ctx}`, correct: false },
        ],
        explanation: `${t} is known for its reliability and consistent performance across various ${ctx} scenarios.`,
      },
      {
        q: `In the context of ${ctx}, when would you typically apply ${t}?`,
        opts: [
          { text: `When you need to ensure accuracy and efficiency in the process`, correct: true },
          { text: `Only during the final stages of a project`, correct: false },
          { text: `When all other approaches have failed`, correct: false },
          { text: `It is never applied in practical scenarios`, correct: false },
        ],
        explanation: `${t} is typically applied when accuracy and efficiency are critical requirements in ${ctx}.`,
      },
      {
        q: `What distinguishes ${t} from other related concepts in ${ctx}?`,
        opts: [
          { text: `Its unique approach to problem-solving and broader applicability`, correct: true },
          { text: `It is identical to all other concepts`, correct: false },
          { text: `It was developed more recently than all alternatives`, correct: false },
          { text: `It requires no prior knowledge to implement`, correct: false },
        ],
        explanation: `${t} stands out due to its distinctive methodology and wide range of applications in ${ctx}.`,
      },
      {
        q: `Which of the following is a prerequisite for understanding ${t}?`,
        opts: [
          { text: `Basic knowledge of ${ctx} fundamentals`, correct: true },
          { text: `Advanced expertise in unrelated fields`, correct: false },
          { text: `No prior knowledge is needed`, correct: false },
          { text: `Completion of all advanced ${ctx} courses`, correct: false },
        ],
        explanation: `A solid foundation in ${ctx} basics is essential before diving into ${t}.`,
      },
      {
        q: `What is a common misconception about ${t}?`,
        opts: [
          { text: `That it is too complex for beginners to understand`, correct: true },
          { text: `That it is the most important concept in all of science`, correct: false },
          { text: `That it was discovered in the 21st century`, correct: false },
          { text: `That it has been proven wrong`, correct: false },
        ],
        explanation: `While ${t} may seem complex initially, it is accessible with proper ${ctx} foundation.`,
      },
      {
        q: `How does ${t} contribute to the field of ${ctx}?`,
        opts: [
          { text: `It provides essential frameworks for analysis and practical implementation`, correct: true },
          { text: `It creates unnecessary complications`, correct: false },
          { text: `It has no measurable impact on the field`, correct: false },
          { text: `It only contributes to theoretical discussions`, correct: false },
        ],
        explanation: `${t} plays a vital role in ${ctx} by offering practical frameworks for both analysis and implementation.`,
      },
    ],
    'mcq-multiple': [
      {
        q: `Which of the following are valid applications of ${t} in ${ctx}? (Select all that apply)`,
        opts: [
          { text: `Problem analysis and diagnosis in ${ctx}`, correct: true },
          { text: `Design and implementation of ${ctx} solutions`, correct: true },
          { text: `Quality assurance and validation`, correct: true },
          { text: `Replacing human judgment entirely`, correct: false },
          { text: `Eliminating the need for testing`, correct: false },
        ],
        explanation: `${t} is applied in analysis, design, implementation, and quality assurance within ${ctx}.`,
      },
      {
        q: `Select all the key components that make up ${t}:`,
        opts: [
          { text: `Core principles and theoretical foundation`, correct: true },
          { text: `Practical methodologies and best practices`, correct: true },
          { text: `Evaluation and feedback mechanisms`, correct: true },
          { text: `Random guessing techniques`, correct: false },
          { text: `Unrelated mathematical proofs`, correct: false },
        ],
        explanation: `${t} consists of theoretical foundations, practical methodologies, and evaluation mechanisms.`,
      },
      {
        q: `Which benefits does ${t} provide in ${ctx}? (Choose all correct answers)`,
        opts: [
          { text: `Improved efficiency and productivity`, correct: true },
          { text: `Better accuracy and consistency`, correct: true },
          { text: `Guaranteed perfection in all cases`, correct: false },
          { text: `Scalability for larger problems`, correct: true },
          { text: `Zero cost of implementation`, correct: false },
        ],
        explanation: `${t} offers efficiency, accuracy, consistency, and scalability, but not perfection or zero cost.`,
      },
      {
        q: `Which of the following skills are needed to effectively use ${t}? (Select all)`,
        opts: [
          { text: `Understanding of ${ctx} fundamentals`, correct: true },
          { text: `Analytical thinking and problem-solving`, correct: true },
          { text: `Memorization of all formulas without understanding`, correct: false },
          { text: `Ability to apply concepts to real-world scenarios`, correct: true },
        ],
        explanation: `Effective use of ${t} requires fundamentals knowledge, analytical thinking, and practical application skills.`,
      },
    ],
    'true-false': [
      { q: `${t} is widely recognized as a fundamental concept in ${ctx}.`, answer: true, explanation: `True. ${t} is indeed a fundamental and widely recognized concept in ${ctx}.` },
      { q: `${t} can be applied to solve real-world problems in ${ctx}.`, answer: true, explanation: `True. ${t} has numerous practical applications in real-world ${ctx} scenarios.` },
      { q: `${t} has no practical applications in modern ${ctx}.`, answer: false, explanation: `False. ${t} has many practical applications in modern ${ctx}.` },
      { q: `Understanding ${t} requires no background knowledge in ${ctx}.`, answer: false, explanation: `False. A foundation in ${ctx} basics is helpful for understanding ${t}.` },
      { q: `${t} can be combined with other techniques in ${ctx} for better results.`, answer: true, explanation: `True. ${t} is often used in combination with other ${ctx} techniques for optimal outcomes.` },
      { q: `${t} is only applicable to theoretical problems and cannot handle real data.`, answer: false, explanation: `False. ${t} is designed to handle both theoretical and real-world data in ${ctx}.` },
      { q: `The principles of ${t} remain consistent regardless of the scale of the problem.`, answer: true, explanation: `True. The core principles of ${t} are scalable and apply at any problem size.` },
      { q: `${t} was developed after all other concepts in ${ctx} were already established.`, answer: false, explanation: `False. ${t} was developed as part of the natural evolution of ${ctx}, not after everything else.` },
    ],
    'fill-blank': [
      { q: `The primary goal of ${t} is to _____ within the domain of ${ctx}.`, correctAnswer: ['solve problems', 'provide solutions', 'address challenges'], explanation: `${t} aims to solve problems and provide solutions in ${ctx}.` },
      { q: `In ${ctx}, ${t} is classified as a _____ approach.`, correctAnswer: ['systematic', 'structured', 'methodical'], explanation: `${t} follows a systematic and structured approach in ${ctx}.` },
      { q: `A key advantage of using ${t} is its _____ in handling complex scenarios.`, correctAnswer: ['reliability', 'effectiveness', 'efficiency'], explanation: `${t} is valued for its reliability and effectiveness in complex scenarios.` },
      { q: `The first step in applying ${t} to a problem in ${ctx} is to _____ the requirements.`, correctAnswer: ['analyze', 'identify', 'define'], explanation: `Before applying ${t}, one must first analyze and identify the requirements.` },
      { q: `${t} helps ensure _____ in ${ctx} processes and outcomes.`, correctAnswer: ['quality', 'consistency', 'accuracy'], explanation: `${t} contributes to quality, consistency, and accuracy in ${ctx}.` },
    ],
    'numerical': [
      { q: `If a system based on ${t} processes 10 units per hour, how many units will it process in 8 hours?`, answer: 80, tolerance: 0, explanation: `10 units/hour × 8 hours = 80 units. Basic multiplication applied to ${t}.` },
      { q: `A ${t} implementation has an efficiency rate of 85%. If 200 tasks are submitted, how many are expected to complete successfully?`, answer: 170, tolerance: 0, explanation: `200 × 0.85 = 170 tasks. Application of percentage calculation to ${t}.` },
      { q: `In a ${t} system, if the error rate is 3% and 1000 operations are performed, how many errors are expected?`, answer: 30, tolerance: 0, explanation: `1000 × 0.03 = 30 errors. Applying error rate calculation.` },
      { q: `If ${t} reduces processing time by 40%, and the original time was 50 minutes, what is the new processing time?`, answer: 30, tolerance: 0, explanation: `50 - (50 × 0.40) = 50 - 20 = 30 minutes.` },
      { q: `A ${t} benchmark scores 75 out of 100. What is this as a decimal?`, answer: 0.75, tolerance: 0.01, explanation: `75 ÷ 100 = 0.75` },
    ],
    'short-answer': [
      { q: `Briefly explain what ${t} means in the context of ${ctx}.`, correctAnswer: `${t} is a concept/methodology in ${ctx} that provides a systematic approach to understanding and solving related problems.`, explanation: `A good answer should define ${t} and relate it to ${ctx}.` },
      { q: `Name two key benefits of ${t}.`, correctAnswer: `Two key benefits of ${t} are improved efficiency and better accuracy in ${ctx} applications.`, explanation: `Benefits include efficiency, accuracy, consistency, and scalability.` },
      { q: `How is ${t} typically applied in practice?`, correctAnswer: `${t} is applied by first analyzing the problem, then selecting the appropriate method, and finally implementing and evaluating the results.`, explanation: `Practical application follows a systematic process.` },
      { q: `What prerequisites should someone have before studying ${t}?`, correctAnswer: `Basic understanding of ${ctx} fundamentals and analytical thinking skills are recommended prerequisites.`, explanation: `Foundation in fundamentals is important for studying ${t}.` },
    ],
    'long-answer': [
      { q: `Provide a comprehensive explanation of ${t} and its significance in ${ctx}. Include examples where applicable.`, correctAnswer: `A comprehensive answer should cover the definition of ${t}, its key principles, real-world applications in ${ctx}, and its significance to the field.`, explanation: `This essay question tests deep understanding of ${t} in ${ctx}.` },
      { q: `Compare and contrast ${t} with traditional approaches in ${ctx}. Discuss advantages and limitations.`, correctAnswer: `The answer should discuss how ${t} differs from traditional methods, its advantages (efficiency, accuracy) and limitations, with specific examples.`, explanation: `A comparative analysis requires understanding both ${t} and conventional approaches.` },
      { q: `Discuss the evolution of ${t} in ${ctx} and predict future developments.`, correctAnswer: `The answer should trace the historical development of ${t}, current state, and reasoned predictions about future trends.`, explanation: `This tests both historical knowledge and critical thinking about ${t}.` },
    ],
    'matching': [
      {
        q: `Match the following concepts related to ${t} with their descriptions:`,
        matchPairs: [
          { left: `Core principle of ${t}`, right: 'Provides the theoretical foundation' },
          { left: `Application of ${t}`, right: 'Practical use in real scenarios' },
          { left: `Limitation of ${t}`, right: 'Boundary conditions and constraints' },
          { left: `Benefit of ${t}`, right: 'Measurable improvement in outcomes' },
        ],
        explanation: `Each concept of ${t} maps to its appropriate description.`,
      },
      {
        q: `Match the ${t} terms with their definitions:`,
        matchPairs: [
          { left: 'Analysis phase', right: 'Understanding the problem requirements' },
          { left: 'Design phase', right: 'Planning the solution approach' },
          { left: 'Implementation phase', right: 'Building the actual solution' },
          { left: 'Evaluation phase', right: 'Testing and validating results' },
        ],
        explanation: `The phases of applying ${t} follow a logical progression.`,
      },
    ],
    'ordering': [
      {
        q: `Arrange the following steps of the ${t} process in the correct order:`,
        orderItems: [
          'Identify the problem or objective',
          `Analyze requirements using ${t} principles`,
          'Design the solution approach',
          'Implement the solution',
          'Test and validate the results',
          'Document and review the outcome',
        ],
        explanation: `The ${t} process follows a systematic order from problem identification to documentation.`,
      },
      {
        q: `Order the following concepts from most fundamental to most advanced in ${t}:`,
        orderItems: [
          `Basic terminology of ${t}`,
          `Core principles and rules`,
          `Standard applications and methods`,
          `Advanced techniques and optimizations`,
          `Research and innovation in ${t}`,
        ],
        explanation: `Learning ${t} progresses from basic terminology through advanced research.`,
      },
    ],
    'code': [
      {
        q: `Write a function that demonstrates the basic concept of ${t}. The function should take an input, process it, and return the result.\n\nExample:\n- Input: "test"\n- Output: "processed: test"`,
        correctAnswer: `function process(input) {\n  // Apply ${t} concept\n  return "processed: " + input;\n}`,
        explanation: `This tests the ability to implement a basic ${t} concept in code.`,
      },
      {
        q: `Write a function that validates whether a given input meets the criteria defined by ${t}. Return true if valid, false otherwise.\n\nCriteria: Input must be a non-empty string with at least 3 characters.`,
        correctAnswer: `function validate(input) {\n  if (typeof input !== 'string') return false;\n  if (input.trim().length < 3) return false;\n  return true;\n}`,
        explanation: `Validation is a common application of ${t} principles in coding.`,
      },
    ],
  };

  const bank = questionBanks[questionType] || questionBanks['mcq-single'];

  for (let i = 0; i < count; i++) {
    const template = bank[i % bank.length];
    const diff = difficulties[i % difficulties.length];
    const marks = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3;

    const question = {
      questionText: template.q,
      questionType,
      difficulty: diff,
      marks,
      explanation: template.explanation || '',
    };

    // Build type-specific data
    if (questionType === 'mcq-single') {
      question.options = shuffle(template.opts).map(o => ({ text: o.text, isCorrect: o.correct }));
    } else if (questionType === 'mcq-multiple') {
      question.options = shuffle(template.opts).map(o => ({ text: o.text, isCorrect: o.correct }));
    } else if (questionType === 'true-false') {
      question.options = [
        { text: 'True', isCorrect: template.answer === true },
        { text: 'False', isCorrect: template.answer === false },
      ];
    } else if (questionType === 'fill-blank') {
      const answers = template.correctAnswer || [t];
      question.correctAnswer = answers;
      question.blanks = [{
        position: 0,
        acceptedAnswers: answers,
        caseSensitive: false,
      }];
    } else if (questionType === 'numerical') {
      question.correctAnswer = template.answer ?? 0;
      question.answerTolerance = template.tolerance ?? 0.01;
    } else if (questionType === 'short-answer' || questionType === 'long-answer') {
      question.correctAnswer = template.correctAnswer || '';
    } else if (questionType === 'matching') {
      question.matchPairs = template.matchPairs || [];
    } else if (questionType === 'ordering') {
      question.orderItems = template.orderItems || [];
      question.correctAnswer = template.orderItems || [];
    } else if (questionType === 'code') {
      question.correctAnswer = template.correctAnswer || '';
      question.codeLanguage = 'javascript';
    }

    questions.push(question);
  }

  return questions;
}

// @desc    Import questions from text/CSV
// @route   POST /api/admin/exams/:examId/questions/import
// @access  Admin
export const importQuestions = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      throw new AppError('Exam not found', 404);
    }

    if (exam.status !== 'draft') {
      throw new AppError('Cannot add questions to a published exam', 400);
    }

    const { questions: importedQuestions, format = 'json' } = req.body;

    if (!importedQuestions || !Array.isArray(importedQuestions)) {
      throw new AppError('Invalid questions data', 400);
    }

    // Get starting question number
    const lastQuestion = await Question.findOne({ exam: exam._id })
      .sort({ questionNumber: -1 });
    let questionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

    const createdQuestions = [];
    const errors = [];

    for (let i = 0; i < importedQuestions.length; i++) {
      try {
        const q = importedQuestions[i];
        
        let processedOptions = [];
        let correctOptionIds = [];

        if (q.options && q.options.length > 0) {
          processedOptions = q.options.map(opt => ({
            _id: new mongoose.Types.ObjectId(),
            text: typeof opt === 'string' ? opt : opt.text,
            imageUrl: opt.imageUrl || null,
            isCorrect: opt.isCorrect || false,
          }));

          if (q.correctOptions) {
            correctOptionIds = q.correctOptions.map(idx => processedOptions[idx]?._id).filter(Boolean);
          } else if (q.correctAnswer !== undefined && typeof q.correctAnswer === 'number') {
            correctOptionIds = [processedOptions[q.correctAnswer]?._id].filter(Boolean);
          } else {
            correctOptionIds = processedOptions.filter(opt => opt.isCorrect).map(opt => opt._id);
          }
        }

        const questionData = {
          exam: exam._id,
          questionNumber: questionNumber++,
          questionText: q.questionText || q.question || q.text,
          questionType: q.questionType || q.type || 'mcq-single',
          difficulty: q.difficulty || 'medium',
          marks: q.marks || 1,
          negativeMarks: q.negativeMarks || 0,
          explanation: q.explanation || '',
          section: q.section || 'General',
          tags: q.tags || [],
          sourceReference: q.sourceReference || q.source || '',
          sourceUrl: q.sourceUrl || '',
          createdBy: req.user._id,
        };

        if (processedOptions.length > 0) {
          questionData.options = processedOptions;
          questionData.correctOptions = correctOptionIds;
        }

        if (q.correctAnswer && !['mcq-single', 'mcq-multiple', 'true-false'].includes(questionData.questionType)) {
          questionData.correctAnswer = q.correctAnswer;
        }

        const question = await Question.create(questionData);
        createdQuestions.push(question);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    // Update exam total marks
    await updateExamTotalMarks(exam._id);

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions imported successfully`,
      data: {
        questions: createdQuestions,
        imported: createdQuestions.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate question
// @route   POST /api/admin/questions/:id/duplicate
// @access  Admin
export const duplicateQuestion = async (req, res, next) => {
  try {
    const originalQuestion = await Question.findById(req.params.id);
    if (!originalQuestion) {
      throw new AppError('Question not found', 404);
    }

    const exam = await Exam.findById(originalQuestion.exam);
    if (!exam || exam.status !== 'draft') {
      throw new AppError('Cannot duplicate question for this exam', 400);
    }

    // Get next question number
    const lastQuestion = await Question.findOne({ exam: exam._id })
      .sort({ questionNumber: -1 });
    const questionNumber = lastQuestion ? lastQuestion.questionNumber + 1 : 1;

    // Create duplicate
    const duplicateData = originalQuestion.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    duplicateData.questionNumber = questionNumber;
    duplicateData.questionText = `[Copy] ${duplicateData.questionText}`;
    duplicateData.createdBy = req.user._id;

    // Generate new IDs for options
    if (duplicateData.options) {
      const oldToNewIdMap = {};
      duplicateData.options = duplicateData.options.map(opt => {
        const newId = new mongoose.Types.ObjectId();
        oldToNewIdMap[opt._id.toString()] = newId;
        return { ...opt, _id: newId };
      });
      
      if (duplicateData.correctOptions) {
        duplicateData.correctOptions = duplicateData.correctOptions.map(
          oldId => oldToNewIdMap[oldId.toString()]
        ).filter(Boolean);
      }
    }

    const question = await Question.create(duplicateData);

    // Update exam total marks
    await updateExamTotalMarks(exam._id);

    res.status(201).json({
      success: true,
      message: 'Question duplicated successfully',
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createQuestion,
  getQuestions,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  bulkCreateQuestions,
  reorderQuestions,
  generateQuestions,
  importQuestions,
  duplicateQuestion,
};
