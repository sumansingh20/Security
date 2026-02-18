import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    trim: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Match pair schema for matching questions
const matchPairSchema = new mongoose.Schema({
  left: { type: String, trim: true },
  right: { type: String, trim: true },
}, { _id: true });

const questionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam reference is required'],
    index: true,
  },
  questionNumber: {
    type: Number,
    required: true,
  },
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  // Extended question types
  questionType: {
    type: String,
    enum: [
      'mcq-single',      // Single choice MCQ
      'mcq-multiple',    // Multiple choice MCQ
      'true-false',      // True/False
      'fill-blank',      // Fill in the blank
      'numerical',       // Numerical answer
      'short-answer',    // Short text answer
      'long-answer',     // Long text/essay answer
      'matching',        // Match the following
      'ordering',        // Arrange in order
      'image-based',     // Image-based question
      'audio-based',     // Audio-based question
      'video-based',     // Video-based question
      'code',            // Programming/code question
      'hotspot',         // Click on image hotspot
    ],
    default: 'mcq-single',
  },
  options: {
    type: [optionSchema],
    default: [],
  },
  correctOptions: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
  // For fill-in-blank, numerical, short-answer
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,  // Can be string, number, or array
    default: null,
  },
  // For numerical questions - acceptable range
  answerTolerance: {
    type: Number,
    default: 0,
  },
  // For matching questions
  matchPairs: {
    type: [matchPairSchema],
    default: [],
  },
  // For ordering questions - correct order array
  correctOrder: [{
    type: String,
  }],
  // For fill-blank - multiple blanks support
  blanks: [{
    position: Number,
    acceptedAnswers: [String],  // Multiple accepted answers for each blank
    caseSensitive: { type: Boolean, default: false },
  }],
  // Media attachments
  imageUrl: {
    type: String,
    default: null,
  },
  imageCaption: {
    type: String,
    default: '',
  },
  audioUrl: {
    type: String,
    default: null,
  },
  videoUrl: {
    type: String,
    default: null,
  },
  // External resource link
  resourceUrl: {
    type: String,
    default: null,
  },
  resourceTitle: {
    type: String,
    default: '',
  },
  // Hotspot coordinates for image-based questions
  hotspots: [{
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    isCorrect: Boolean,
  }],
  // Code question settings
  codeLanguage: {
    type: String,
    enum: ['javascript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'sql', 'html', 'css', 'other'],
    default: 'javascript',
  },
  codeTemplate: {
    type: String,
    default: '',
  },
  expectedOutput: {
    type: String,
    default: '',
  },
  testCases: [{
    input: String,
    expectedOutput: String,
    isHidden: { type: Boolean, default: false },
  }],
  marks: {
    type: Number,
    required: [true, 'Marks are required'],
    min: [0, 'Marks cannot be negative'],
    default: 1,
  },
  negativeMarks: {
    type: Number,
    default: 0,
    min: [0, 'Negative marks cannot be negative'],
  },
  partialMarking: {
    type: Boolean,
    default: false,
  },
  explanation: {
    type: String,
    default: '',
    trim: true,
  },
  hint: {
    type: String,
    default: '',
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  tags: [{
    type: String,
    trim: true,
  }],
  // Section/Category
  section: {
    type: String,
    default: 'General',
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  // Time limit per question (optional)
  timeLimit: {
    type: Number,
    default: 0,  // 0 means no individual time limit
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // AI generation metadata
  generatedByAI: {
    type: Boolean,
    default: false,
  },
  aiSource: {
    type: String,
    default: null,
  },
  // Source reference (web link, book, etc.)
  sourceReference: {
    type: String,
    default: '',
  },
  sourceUrl: {
    type: String,
    default: '',
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound index for exam and question number
questionSchema.index({ exam: 1, questionNumber: 1 }, { unique: true });
questionSchema.index({ exam: 1, section: 1 });
questionSchema.index({ questionType: 1 });
questionSchema.index({ tags: 1 });

// Pre-save validation
questionSchema.pre('save', function(next) {
  // Validate correct options for MCQ types
  if (['mcq-single', 'mcq-multiple', 'true-false'].includes(this.questionType)) {
    if (this.options && this.options.length > 0 && this.correctOptions && this.correctOptions.length > 0) {
      const optionIds = this.options.map(opt => opt._id.toString());
      const validCorrectOptions = this.correctOptions.every(
        correctOpt => optionIds.includes(correctOpt.toString())
      );
      
      if (!validCorrectOptions) {
        const error = new Error('Correct options must reference existing options');
        return next(error);
      }
    }

    // For single choice, only one correct option allowed
    if (this.questionType === 'mcq-single' && this.correctOptions && this.correctOptions.length > 1) {
      const error = new Error('Single choice questions must have exactly one correct option');
      return next(error);
    }
  }

  next();
});

// Virtual for checking if question has image
questionSchema.virtual('hasImage').get(function() {
  return !!this.imageUrl;
});

// Virtual for checking if question has media
questionSchema.virtual('hasMedia').get(function() {
  return !!(this.imageUrl || this.audioUrl || this.videoUrl);
});

// Method to check answer (returns marks obtained)
questionSchema.methods.checkAnswer = function(answer) {
  if (answer === undefined || answer === null || 
      (Array.isArray(answer) && answer.length === 0) ||
      (typeof answer === 'string' && answer.trim() === '')) {
    return 0; // No answer, no marks, no negative
  }

  switch (this.questionType) {
    case 'mcq-single':
    case 'true-false': {
      const correctSet = new Set(this.correctOptions.map(id => id.toString()));
      const selectedOptions = Array.isArray(answer) ? answer : [answer];
      const selectedSet = new Set(selectedOptions.map(id => id.toString()));
      
      if (selectedSet.size === 1 && correctSet.has([...selectedSet][0])) {
        return this.marks;
      }
      return -this.negativeMarks;
    }

    case 'mcq-multiple': {
      const correctSet = new Set(this.correctOptions.map(id => id.toString()));
      const selectedOptions = Array.isArray(answer) ? answer : [answer];
      const selectedSet = new Set(selectedOptions.map(id => id.toString()));
      
      let correct = 0;
      let incorrect = 0;

      for (const selected of selectedSet) {
        if (correctSet.has(selected)) {
          correct++;
        } else {
          incorrect++;
        }
      }

      if (incorrect > 0) {
        return this.partialMarking ? 
          Math.max(0, ((correct / correctSet.size) - (incorrect * 0.25)) * this.marks) : 
          -this.negativeMarks;
      }

      // Partial marks based on correct selections
      return this.partialMarking ? 
        (correct / correctSet.size) * this.marks :
        (correct === correctSet.size ? this.marks : 0);
    }

    case 'numerical': {
      const numAnswer = parseFloat(answer);
      const correctNum = parseFloat(this.correctAnswer);
      
      if (isNaN(numAnswer) || isNaN(correctNum)) {
        return 0;
      }
      
      const tolerance = this.answerTolerance || 0;
      if (Math.abs(numAnswer - correctNum) <= tolerance) {
        return this.marks;
      }
      return -this.negativeMarks;
    }

    case 'fill-blank': {
      if (this.blanks && this.blanks.length > 0) {
        // Multiple blanks
        const answers = Array.isArray(answer) ? answer : [answer];
        let correctCount = 0;
        
        this.blanks.forEach((blank, index) => {
          const userAnswer = answers[index] || '';
          const acceptedAnswers = blank.acceptedAnswers || [];
          const isCorrect = acceptedAnswers.some(accepted => 
            blank.caseSensitive ? 
              userAnswer.trim() === accepted.trim() :
              userAnswer.trim().toLowerCase() === accepted.trim().toLowerCase()
          );
          if (isCorrect) correctCount++;
        });
        
        if (this.partialMarking) {
          return (correctCount / this.blanks.length) * this.marks;
        }
        return correctCount === this.blanks.length ? this.marks : -this.negativeMarks;
      } else {
        // Single blank - check against correctAnswer
        const acceptedAnswers = Array.isArray(this.correctAnswer) ? 
          this.correctAnswer : [this.correctAnswer];
        const isCorrect = acceptedAnswers.some(accepted =>
          answer.trim().toLowerCase() === String(accepted).trim().toLowerCase()
        );
        return isCorrect ? this.marks : -this.negativeMarks;
      }
    }

    case 'short-answer': {
      const acceptedAnswers = Array.isArray(this.correctAnswer) ? 
        this.correctAnswer : [this.correctAnswer];
      const isCorrect = acceptedAnswers.some(accepted =>
        answer.trim().toLowerCase() === String(accepted).trim().toLowerCase()
      );
      return isCorrect ? this.marks : 0; // No negative for short answers
    }

    case 'matching': {
      if (!Array.isArray(answer) || !this.matchPairs) return 0;
      
      let correctCount = 0;
      this.matchPairs.forEach((pair, index) => {
        if (answer[index] === pair.right) {
          correctCount++;
        }
      });
      
      if (this.partialMarking) {
        return (correctCount / this.matchPairs.length) * this.marks;
      }
      return correctCount === this.matchPairs.length ? this.marks : 0;
    }

    case 'ordering': {
      if (!Array.isArray(answer) || !this.correctOrder) return 0;
      
      const isCorrect = JSON.stringify(answer) === JSON.stringify(this.correctOrder);
      if (isCorrect) return this.marks;
      
      if (this.partialMarking) {
        let correctPositions = 0;
        answer.forEach((item, index) => {
          if (this.correctOrder[index] === item) correctPositions++;
        });
        return (correctPositions / this.correctOrder.length) * this.marks;
      }
      return 0;
    }

    case 'hotspot': {
      if (!this.hotspots || this.hotspots.length === 0) return 0;
      
      const clickX = answer.x;
      const clickY = answer.y;
      
      const hitCorrectSpot = this.hotspots.some(spot => 
        spot.isCorrect &&
        clickX >= spot.x && clickX <= (spot.x + spot.width) &&
        clickY >= spot.y && clickY <= (spot.y + spot.height)
      );
      
      return hitCorrectSpot ? this.marks : -this.negativeMarks;
    }

    case 'long-answer':
    case 'code':
      // These require manual grading
      return null; // null indicates manual grading needed

    default:
      return 0;
  }
};

// Method to get question for student (without correct answers)
questionSchema.methods.toStudentView = function() {
  const base = {
    _id: this._id,
    questionNumber: this.questionNumber,
    questionText: this.questionText,
    questionType: this.questionType,
    marks: this.marks,
    negativeMarks: this.negativeMarks,
    section: this.section,
    timeLimit: this.timeLimit,
    hint: this.hint,
  };

  // Add options for MCQ types
  if (['mcq-single', 'mcq-multiple', 'true-false'].includes(this.questionType)) {
    base.options = this.options.map(opt => ({
      _id: opt._id,
      text: opt.text,
      imageUrl: opt.imageUrl,
    }));
  }

  // Add match pairs for matching (randomize right side)
  if (this.questionType === 'matching' && this.matchPairs) {
    base.matchPairs = this.matchPairs.map(p => ({ left: p.left, _id: p._id }));
    base.rightOptions = this.matchPairs
      .map(p => p.right)
      .sort(() => Math.random() - 0.5);
  }

  // Add items for ordering (shuffled)
  if (this.questionType === 'ordering' && this.correctOrder) {
    base.orderItems = [...this.correctOrder].sort(() => Math.random() - 0.5);
  }

  // Add blanks count for fill-in-blank
  if (this.questionType === 'fill-blank' && this.blanks) {
    base.blanksCount = this.blanks.length || 1;
  }

  // Media
  if (this.imageUrl) base.imageUrl = this.imageUrl;
  if (this.imageCaption) base.imageCaption = this.imageCaption;
  if (this.audioUrl) base.audioUrl = this.audioUrl;
  if (this.videoUrl) base.videoUrl = this.videoUrl;
  if (this.resourceUrl) {
    base.resourceUrl = this.resourceUrl;
    base.resourceTitle = this.resourceTitle;
  }

  // Code question
  if (this.questionType === 'code') {
    base.codeLanguage = this.codeLanguage;
    base.codeTemplate = this.codeTemplate;
    base.testCases = (this.testCases || [])
      .filter(tc => !tc.isHidden)
      .map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput }));
  }

  // Hotspots (without correct info)
  if (this.questionType === 'hotspot' && this.hotspots) {
    base.hasHotspots = true;
  }

  return base;
};

// Method to get question for review (with correct answers)
questionSchema.methods.toReviewView = function(showExplanation = false) {
  return {
    ...this.toStudentView(),
    correctOptions: this.correctOptions,
    explanation: showExplanation ? this.explanation : undefined,
  };
};

// Static method to get questions for exam
questionSchema.statics.getExamQuestions = async function(examId, forStudent = true) {
  const questions = await this.find({ 
    exam: examId, 
    isActive: true 
  }).sort({ questionNumber: 1 });

  if (forStudent) {
    return questions.map(q => q.toStudentView());
  }
  return questions;
};

// Static method to randomize questions
questionSchema.statics.getRandomizedQuestions = async function(examId, randomizeOptions = false) {
  const questions = await this.find({ 
    exam: examId, 
    isActive: true 
  });

  // Shuffle questions
  const shuffled = questions.sort(() => Math.random() - 0.5);

  return shuffled.map((q, index) => {
    const studentView = q.toStudentView();
    studentView.questionNumber = index + 1;
    
    if (randomizeOptions) {
      studentView.options = studentView.options.sort(() => Math.random() - 0.5);
    }
    
    return studentView;
  });
};

const Question = mongoose.model('Question', questionSchema);

export default Question;
