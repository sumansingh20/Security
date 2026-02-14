import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Option text is required'],
    trim: true,
  },
  imageUrl: {
    type: String,
    default: null,
  },
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
  questionType: {
    type: String,
    enum: ['mcq-single', 'mcq-multiple', 'true-false'],
    default: 'mcq-single',
  },
  options: {
    type: [optionSchema],
    validate: {
      validator: function(options) {
        if (this.questionType === 'true-false') {
          return options.length === 2;
        }
        return options.length >= 2 && options.length <= 6;
      },
      message: 'Invalid number of options',
    },
  },
  correctOptions: [{
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  }],
  imageUrl: {
    type: String,
    default: null,
  },
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
  explanation: {
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
  isActive: {
    type: Boolean,
    default: true,
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

// Pre-save validation for correct options
questionSchema.pre('save', function(next) {
  // Validate that correct options exist in options array
  const optionIds = this.options.map(opt => opt._id.toString());
  const validCorrectOptions = this.correctOptions.every(
    correctOpt => optionIds.includes(correctOpt.toString())
  );
  
  if (!validCorrectOptions) {
    const error = new Error('Correct options must reference existing options');
    return next(error);
  }

  // For single choice, only one correct option allowed
  if (this.questionType === 'mcq-single' && this.correctOptions.length !== 1) {
    const error = new Error('Single choice questions must have exactly one correct option');
    return next(error);
  }

  next();
});

// Virtual for checking if question has image
questionSchema.virtual('hasImage').get(function() {
  return !!this.imageUrl;
});

// Method to check answer (returns marks obtained)
questionSchema.methods.checkAnswer = function(selectedOptions) {
  if (!selectedOptions || selectedOptions.length === 0) {
    return 0; // No answer, no marks, no negative
  }

  const correctSet = new Set(this.correctOptions.map(id => id.toString()));
  const selectedSet = new Set(selectedOptions.map(id => id.toString()));

  if (this.questionType === 'mcq-single') {
    // Single correct answer
    if (selectedSet.size === 1 && correctSet.has([...selectedSet][0])) {
      return this.marks;
    }
    return -this.negativeMarks;
  }

  if (this.questionType === 'mcq-multiple') {
    // Multiple correct answers - partial marking
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
      return -this.negativeMarks;
    }

    // Partial marks based on correct selections
    return (correct / correctSet.size) * this.marks;
  }

  return 0;
};

// Method to get question for student (without correct answers)
questionSchema.methods.toStudentView = function() {
  return {
    _id: this._id,
    questionNumber: this.questionNumber,
    questionText: this.questionText,
    questionType: this.questionType,
    options: this.options.map(opt => ({
      _id: opt._id,
      text: opt.text,
      imageUrl: opt.imageUrl,
    })),
    imageUrl: this.imageUrl,
    marks: this.marks,
    negativeMarks: this.negativeMarks,
    section: this.section,
  };
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
