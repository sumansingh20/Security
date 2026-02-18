import Joi from 'joi';
import AppError from '../utils/AppError.js';

// Validation middleware factory
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return next(new AppError('Validation failed', 400, errors));
    }

    req[property] = value;
    next();
  };
};

// Auth schemas
export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    firstName: Joi.string().max(50).required().messages({
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required',
    }),
    lastName: Joi.string().max(50).required().messages({
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required',
    }),
    studentId: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    batch: Joi.string().allow('', null),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),
};

// Exam schemas
export const examSchemas = {
  create: Joi.object({
    title: Joi.string().max(200).required(),
    description: Joi.string().max(2000).allow(''),
    subject: Joi.string().required(),
    instructions: Joi.string().allow(''),
    duration: Joi.number().min(1).max(480).required(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required(),
    maxAttempts: Joi.number().min(1).max(5).default(1),
    passingMarks: Joi.number().min(0).default(0),
    randomizeQuestions: Joi.boolean().default(false),
    randomizeOptions: Joi.boolean().default(false),
    calculatorEnabled: Joi.boolean().default(false),
    calculatorType: Joi.string().valid('none', 'basic', 'scientific').default('none'),
    allowReview: Joi.boolean().default(false),
    showCorrectAnswers: Joi.boolean().default(false),
    showExplanations: Joi.boolean().default(false),
    reviewAvailableFrom: Joi.date().iso().allow(null),
    enableProctoring: Joi.boolean().default(true),
    maxViolationsBeforeWarning: Joi.number().min(1).default(3),
    maxViolationsBeforeSubmit: Joi.number().min(1).default(5),
    detectTabSwitch: Joi.boolean().default(true),
    detectCopyPaste: Joi.boolean().default(true),
    blockRightClick: Joi.boolean().default(true),
    allowAllStudents: Joi.boolean().default(true),
    allowedStudents: Joi.array().items(Joi.string()),
    negativeMarking: Joi.boolean().default(false),
    negativeMarkValue: Joi.number().min(0).max(1).default(0),
    totalMarks: Joi.number().min(0).default(0),
    status: Joi.string().valid('draft', 'published').default('draft'),
  }),

  update: Joi.object({
    title: Joi.string().max(200),
    description: Joi.string().max(2000).allow(''),
    subject: Joi.string(),
    instructions: Joi.string().allow(''),
    duration: Joi.number().min(1).max(480),
    startTime: Joi.date().iso(),
    endTime: Joi.date().iso(),
    maxAttempts: Joi.number().min(1).max(5),
    passingMarks: Joi.number().min(0),
    randomizeQuestions: Joi.boolean(),
    randomizeOptions: Joi.boolean(),
    calculatorEnabled: Joi.boolean(),
    calculatorType: Joi.string().valid('none', 'basic', 'scientific'),
    allowReview: Joi.boolean(),
    showCorrectAnswers: Joi.boolean(),
    showExplanations: Joi.boolean(),
    reviewAvailableFrom: Joi.date().iso().allow(null),
    enableProctoring: Joi.boolean(),
    maxViolationsBeforeWarning: Joi.number().min(1),
    maxViolationsBeforeSubmit: Joi.number().min(1),
    detectTabSwitch: Joi.boolean(),
    detectCopyPaste: Joi.boolean(),
    blockRightClick: Joi.boolean(),
    allowAllStudents: Joi.boolean(),
    allowedStudents: Joi.array().items(Joi.string()),

    negativeMarking: Joi.boolean(),
    negativeMarkValue: Joi.number().min(0).max(1),
    totalMarks: Joi.number().min(0),
    enableBatching: Joi.boolean(),
    batchSize: Joi.number().min(10).max(1000),
    batchBufferMinutes: Joi.number().min(5).max(60),
    enrolledStudents: Joi.array().items(Joi.string()),
    maxAttempts: Joi.number().min(1).max(5),
  }),
};

// Question schemas
export const questionSchemas = {
  create: Joi.object({
    questionText: Joi.string().required(),
    questionType: Joi.string().valid(
      'mcq-single', 'mcq-multiple', 'true-false', 
      'fill-blank', 'numerical', 'short-answer', 'long-answer',
      'matching', 'ordering', 'image-based', 'audio-based', 
      'video-based', 'code', 'hotspot'
    ).default('mcq-single'),
    options: Joi.array().items(
      Joi.object({
        text: Joi.string().allow(''),
        imageUrl: Joi.string().uri().allow(null, ''),
        isCorrect: Joi.boolean().default(false),
      })
    ).default([]),
    correctOptions: Joi.array().items(Joi.number().min(0)).default([]),
    correctAnswer: Joi.alternatives().try(
      Joi.string().allow(''),
      Joi.number(),
      Joi.array().items(Joi.string())
    ).default(null),
    answerTolerance: Joi.number().min(0).default(0),
    matchPairs: Joi.array().items(
      Joi.object({
        left: Joi.string().required(),
        right: Joi.string().required(),
      })
    ).default([]),
    correctOrder: Joi.array().items(Joi.string()).default([]),
    blanks: Joi.array().items(
      Joi.object({
        position: Joi.number(),
        acceptedAnswers: Joi.array().items(Joi.string()),
        caseSensitive: Joi.boolean().default(false),
      })
    ).default([]),
    imageUrl: Joi.string().uri().allow(null, ''),
    imageCaption: Joi.string().allow(''),
    audioUrl: Joi.string().uri().allow(null, ''),
    videoUrl: Joi.string().uri().allow(null, ''),
    resourceUrl: Joi.string().uri().allow(null, ''),
    resourceTitle: Joi.string().allow(''),
    hotspots: Joi.array().items(
      Joi.object({
        x: Joi.number(),
        y: Joi.number(),
        width: Joi.number(),
        height: Joi.number(),
        isCorrect: Joi.boolean(),
      })
    ).default([]),
    codeLanguage: Joi.string().valid(
      'javascript', 'python', 'java', 'c', 'cpp', 'csharp', 
      'go', 'rust', 'sql', 'html', 'css', 'other'
    ).default('javascript'),
    codeTemplate: Joi.string().allow(''),
    expectedOutput: Joi.string().allow(''),
    testCases: Joi.array().items(
      Joi.object({
        input: Joi.string().allow(''),
        expectedOutput: Joi.string().allow(''),
        isHidden: Joi.boolean().default(false),
      })
    ).default([]),
    marks: Joi.number().min(0).default(1),
    negativeMarks: Joi.number().min(0).default(0),
    partialMarking: Joi.boolean().default(false),
    explanation: Joi.string().allow(''),
    hint: Joi.string().allow(''),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
    tags: Joi.array().items(Joi.string()).default([]),
    section: Joi.string().default('General'),
    timeLimit: Joi.number().min(0).default(0),
    sourceReference: Joi.string().allow(''),
    sourceUrl: Joi.string().uri().allow(null, ''),
    generatedByAI: Joi.boolean().default(false),
    aiSource: Joi.string().allow(null, ''),
  }),

  update: Joi.object({
    questionText: Joi.string(),
    questionType: Joi.string().valid(
      'mcq-single', 'mcq-multiple', 'true-false', 
      'fill-blank', 'numerical', 'short-answer', 'long-answer',
      'matching', 'ordering', 'image-based', 'audio-based', 
      'video-based', 'code', 'hotspot'
    ),
    options: Joi.array().items(
      Joi.object({
        _id: Joi.string(),
        text: Joi.string().allow(''),
        imageUrl: Joi.string().uri().allow(null, ''),
        isCorrect: Joi.boolean(),
      })
    ),
    correctOptions: Joi.array().items(Joi.string()),
    correctAnswer: Joi.alternatives().try(
      Joi.string().allow(''),
      Joi.number(),
      Joi.array().items(Joi.string())
    ),
    answerTolerance: Joi.number().min(0),
    matchPairs: Joi.array().items(
      Joi.object({
        _id: Joi.string(),
        left: Joi.string(),
        right: Joi.string(),
      })
    ),
    correctOrder: Joi.array().items(Joi.string()),
    blanks: Joi.array().items(
      Joi.object({
        position: Joi.number(),
        acceptedAnswers: Joi.array().items(Joi.string()),
        caseSensitive: Joi.boolean(),
      })
    ),
    imageUrl: Joi.string().uri().allow(null, ''),
    imageCaption: Joi.string().allow(''),
    audioUrl: Joi.string().uri().allow(null, ''),
    videoUrl: Joi.string().uri().allow(null, ''),
    resourceUrl: Joi.string().uri().allow(null, ''),
    resourceTitle: Joi.string().allow(''),
    hotspots: Joi.array().items(
      Joi.object({
        x: Joi.number(),
        y: Joi.number(),
        width: Joi.number(),
        height: Joi.number(),
        isCorrect: Joi.boolean(),
      })
    ),
    codeLanguage: Joi.string().valid(
      'javascript', 'python', 'java', 'c', 'cpp', 'csharp', 
      'go', 'rust', 'sql', 'html', 'css', 'other'
    ),
    codeTemplate: Joi.string().allow(''),
    expectedOutput: Joi.string().allow(''),
    testCases: Joi.array().items(
      Joi.object({
        input: Joi.string().allow(''),
        expectedOutput: Joi.string().allow(''),
        isHidden: Joi.boolean(),
      })
    ),
    marks: Joi.number().min(0),
    negativeMarks: Joi.number().min(0),
    partialMarking: Joi.boolean(),
    explanation: Joi.string().allow(''),
    hint: Joi.string().allow(''),
    difficulty: Joi.string().valid('easy', 'medium', 'hard'),
    tags: Joi.array().items(Joi.string()),
    section: Joi.string(),
    timeLimit: Joi.number().min(0),
    sourceReference: Joi.string().allow(''),
    sourceUrl: Joi.string().uri().allow(null, ''),
    isActive: Joi.boolean(),
  }),

  bulkCreate: Joi.object({
    questions: Joi.array().items(
      Joi.object({
        questionText: Joi.string().required(),
        questionType: Joi.string().valid(
          'mcq-single', 'mcq-multiple', 'true-false', 
          'fill-blank', 'numerical', 'short-answer', 'long-answer',
          'matching', 'ordering', 'image-based', 'audio-based', 
          'video-based', 'code', 'hotspot'
        ).default('mcq-single'),
        options: Joi.array().items(
          Joi.object({
            text: Joi.string().allow(''),
            imageUrl: Joi.string().uri().allow(null, ''),
            isCorrect: Joi.boolean().default(false),
          })
        ).default([]),
        correctOptions: Joi.array().items(Joi.number().min(0)).default([]),
        correctAnswer: Joi.alternatives().try(
          Joi.string().allow(''),
          Joi.number(),
          Joi.array().items(Joi.string())
        ),
        answerTolerance: Joi.number().min(0),
        matchPairs: Joi.array().items(
          Joi.object({
            left: Joi.string(),
            right: Joi.string(),
          })
        ),
        correctOrder: Joi.array().items(Joi.string()),
        blanks: Joi.array().items(
          Joi.object({
            position: Joi.number(),
            acceptedAnswers: Joi.array().items(Joi.string()),
            caseSensitive: Joi.boolean(),
          })
        ),
        imageUrl: Joi.string().uri().allow(null, ''),
        marks: Joi.number().min(0).default(1),
        negativeMarks: Joi.number().min(0).default(0),
        partialMarking: Joi.boolean().default(false),
        explanation: Joi.string().allow(''),
        hint: Joi.string().allow(''),
        difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
        section: Joi.string().default('General'),
        tags: Joi.array().items(Joi.string()),
        sourceReference: Joi.string().allow(''),
        sourceUrl: Joi.string().uri().allow(null, ''),
        generatedByAI: Joi.boolean().default(false),
        aiSource: Joi.string().allow(null, ''),
      })
    ).min(1).required(),
  }),

  // AI Generation schema
  aiGenerate: Joi.object({
    topic: Joi.string().required(),
    subject: Joi.string().required(),
    questionType: Joi.string().valid(
      'mcq-single', 'mcq-multiple', 'true-false', 
      'fill-blank', 'numerical', 'short-answer'
    ).default('mcq-single'),
    difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').default('mixed'),
    count: Joi.number().min(1).max(50).default(5),
    language: Joi.string().default('English'),
    includeExplanations: Joi.boolean().default(true),
    context: Joi.string().allow(''),
  }),
};

// Answer schemas
export const answerSchemas = {
  saveAnswer: Joi.object({
    questionId: Joi.string().required(),
    selectedOptions: Joi.array().items(Joi.string()).default([]),
    markedForReview: Joi.boolean().default(false),
    timeTaken: Joi.number().min(0).default(0),
  }),

  bulkSave: Joi.object({
    answers: Joi.array().items(
      Joi.object({
        questionId: Joi.string().required(),
        selectedOptions: Joi.array().items(Joi.string()).default([]),
        markedForReview: Joi.boolean().default(false),
        timeTaken: Joi.number().min(0).default(0),
      })
    ).required(),
  }),
};

// User schemas
export const userSchemas = {
  updateProfile: Joi.object({
    firstName: Joi.string().max(50),
    lastName: Joi.string().max(50),
    studentId: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    batch: Joi.string().allow('', null),
  }),

  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().max(50).required(),
    lastName: Joi.string().max(50).required(),
    role: Joi.string().valid('admin', 'teacher', 'student').default('student'),
    studentId: Joi.string().allow('', null),
    employeeId: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    batch: Joi.string().allow('', null),
    dateOfBirth: Joi.date().iso().allow(null, ''),
    rollNumber: Joi.string().allow('', null),
    section: Joi.string().allow('', null),
    semester: Joi.number().min(1).max(10).allow(null, ''),
    phone: Joi.string().allow('', null),
    isActive: Joi.boolean().default(true),
  }),

  updateUser: Joi.object({
    firstName: Joi.string().max(50),
    lastName: Joi.string().max(50),
    role: Joi.string().valid('admin', 'teacher', 'student'),
    studentId: Joi.string().allow('', null),
    employeeId: Joi.string().allow('', null),
    department: Joi.string().allow('', null),
    batch: Joi.string().allow('', null),
    dateOfBirth: Joi.date().iso().allow(null, ''),
    rollNumber: Joi.string().allow('', null),
    section: Joi.string().allow('', null),
    semester: Joi.number().min(1).max(10).allow(null, ''),
    phone: Joi.string().allow('', null),
    isActive: Joi.boolean(),
    password: Joi.string().min(8),
  }),

  bulkCreate: Joi.object({
    users: Joi.array().items(
      Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8),
        firstName: Joi.string().max(50).required(),
        lastName: Joi.string().max(50).required(),
        role: Joi.string().valid('admin', 'teacher', 'student').default('student'),
        studentId: Joi.string().allow('', null),
        department: Joi.string().allow('', null),
        batch: Joi.string().allow('', null),
      })
    ).min(1).required(),
  }),
};

// Violation schema
export const violationSchemas = {
  report: Joi.object({
    type: Joi.string().valid(
      'tab-switch',
      'window-blur',
      'copy-attempt',
      'paste-attempt',
      'right-click',
      'devtools-open',
      'multiple-tabs',
      'screenshot-attempt',
      'print-attempt',
      'keyboard-shortcut',
      'fullscreen-exit',
      'navigation',
      'other'
    ).required(),
    description: Joi.string().allow(''),
    questionNumber: Joi.number().allow(null),
    screenResolution: Joi.string().allow(''),
  }),
};

// Query schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    sort: Joi.string().default('-createdAt'),
  }),

  examFilter: Joi.object({
    status: Joi.string().valid('draft', 'published', 'ongoing', 'completed', 'archived'),
    subject: Joi.string(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
  }),

  userFilter: Joi.object({
    role: Joi.string().valid('admin', 'teacher', 'student'),
    isActive: Joi.boolean(),
    department: Joi.string(),
    batch: Joi.string(),
  }),
};

export default {
  validate,
  authSchemas,
  examSchemas,
  questionSchemas,
  answerSchemas,
  userSchemas,
  violationSchemas,
  querySchemas,
};
