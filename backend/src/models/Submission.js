import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  questionNumber: {
    type: Number,
    required: true,
  },
  selectedOptions: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
  // Question state
  visited: {
    type: Boolean,
    default: false,
  },
  markedForReview: {
    type: Boolean,
    default: false,
  },
  answeredAt: {
    type: Date,
    default: null,
  },
  // Evaluation
  isCorrect: {
    type: Boolean,
    default: null,
  },
  marksObtained: {
    type: Number,
    default: 0,
  },
  timeTaken: {
    type: Number, // seconds spent on this question
    default: 0,
  },
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam reference is required'],
    index: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
    index: true,
  },
  // Attempt tracking
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1,
  },
  // Timing
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  submittedAt: {
    type: Date,
    default: null,
  },
  serverEndTime: {
    type: Date,
    required: true,
  },
  // Answers
  answers: [answerSchema],
  // Question order (if randomized)
  questionOrder: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
  // Scores
  totalMarks: {
    type: Number,
    default: 0,
  },
  marksObtained: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  // Statistics
  questionsAttempted: {
    type: Number,
    default: 0,
  },
  correctAnswers: {
    type: Number,
    default: 0,
  },
  wrongAnswers: {
    type: Number,
    default: 0,
  },
  unattempted: {
    type: Number,
    default: 0,
  },
  timeTaken: {
    type: Number, // total time in seconds
    default: 0,
  },
  // Status
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'auto-submitted', 'violation-submitted', 'force-submitted', 'evaluated'],
    default: 'in-progress',
  },
  // Submission metadata
  submissionType: {
    type: String,
    enum: ['manual', 'auto-timeout', 'auto-violation', 'admin-force'],
    default: 'manual',
  },
  terminationReason: {
    type: String,
    default: null,
  },
  submissionIp: {
    type: String,
    default: null,
  },
  submissionUserAgent: {
    type: String,
    default: null,
  },
  // Session binding
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  ipHash: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  // Violation tracking
  totalViolations: {
    type: Number,
    default: 0,
  },
  // Reviewed flag
  isReviewed: {
    type: Boolean,
    default: false,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound index for unique submission per student per exam per attempt
submissionSchema.index(
  { exam: 1, student: 1, attemptNumber: 1 }, 
  { unique: true }
);

// Index for finding active submissions
submissionSchema.index({ status: 1, serverEndTime: 1 });

// Virtual for remaining time
submissionSchema.virtual('remainingTime').get(function() {
  if (this.status !== 'in-progress') return 0;
  
  const now = Date.now();
  const remaining = this.serverEndTime.getTime() - now;
  return Math.max(0, Math.floor(remaining / 1000));
});

// Virtual for question palette state
submissionSchema.virtual('paletteState').get(function() {
  return this.answers.map(answer => ({
    questionNumber: answer.questionNumber,
    questionId: answer.question,
    status: this.getQuestionStatus(answer),
  }));
});

// Method to get question status
submissionSchema.methods.getQuestionStatus = function(answer) {
  const hasAnswer = answer.selectedOptions && answer.selectedOptions.length > 0;
  
  if (!answer.visited) {
    return 'not-visited';
  }
  
  if (hasAnswer && answer.markedForReview) {
    return 'answered-marked';
  }
  
  if (answer.markedForReview) {
    return 'marked';
  }
  
  if (hasAnswer) {
    return 'answered';
  }
  
  return 'not-answered';
};

// Method to update answer
submissionSchema.methods.updateAnswer = function(questionId, selectedOptions, markedForReview = false) {
  const answer = this.answers.find(
    a => a.question.toString() === questionId.toString()
  );
  
  if (answer) {
    answer.selectedOptions = selectedOptions;
    answer.markedForReview = markedForReview;
    answer.visited = true;
    answer.answeredAt = selectedOptions.length > 0 ? new Date() : null;
  }
  
  return answer;
};

// Method to mark question as visited
submissionSchema.methods.visitQuestion = function(questionId) {
  const answer = this.answers.find(
    a => a.question.toString() === questionId.toString()
  );
  
  if (answer && !answer.visited) {
    answer.visited = true;
  }
  
  return answer;
};

// Method to calculate results
submissionSchema.methods.calculateResults = async function() {
  const Question = mongoose.model('Question');
  
  let totalMarks = 0;
  let marksObtained = 0;
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;

  for (const answer of this.answers) {
    const question = await Question.findById(answer.question);
    if (!question) continue;

    totalMarks += question.marks;

    if (!answer.selectedOptions || answer.selectedOptions.length === 0) {
      unattempted++;
      answer.marksObtained = 0;
      answer.isCorrect = null;
      continue;
    }

    const marks = question.checkAnswer(answer.selectedOptions);

    // checkAnswer returns null for manual-grading types (long-answer, code)
    // Treat null as 0 for auto-calculation; admin can grade later
    const effectiveMarks = (marks === null || marks === undefined) ? 0 : marks;
    answer.marksObtained = effectiveMarks;
    marksObtained += effectiveMarks;

    if (marks === null || marks === undefined) {
      // Needs manual grading — don't count as correct or wrong
      answer.isCorrect = null;
    } else if (marks > 0) {
      correct++;
      answer.isCorrect = true;
    } else {
      wrong++;
      answer.isCorrect = false;
    }
  }

  this.totalMarks = totalMarks;
  this.marksObtained = marksObtained;
  this.percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
  this.questionsAttempted = this.answers.length - unattempted;
  this.correctAnswers = correct;
  this.wrongAnswers = wrong;
  this.unattempted = unattempted;

  return this;
};

// Method to check if time is up
submissionSchema.methods.isTimeUp = function() {
  return Date.now() >= this.serverEndTime.getTime();
};

// Static method to get active submission for student
submissionSchema.statics.getActiveSubmission = async function(examId, studentId) {
  return this.findOne({
    exam: examId,
    student: studentId,
    status: 'in-progress',
  });
};

// Static method to get submission count for exam
// Only count completed submissions (not in-progress ones — those are resumed)
submissionSchema.statics.getAttemptCount = async function(examId, studentId) {
  return this.countDocuments({
    exam: examId,
    student: studentId,
    status: { $in: ['submitted', 'auto-submitted', 'violation-submitted', 'force-submitted', 'evaluated'] },
  });
};

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
