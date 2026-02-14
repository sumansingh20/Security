import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  instructions: {
    type: String,
    default: '',
  },
  // Timing
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [480, 'Duration cannot exceed 480 minutes'],
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required'],
  },
  // Exam settings
  maxAttempts: {
    type: Number,
    default: 1,
    min: 1,
    max: 5,
  },
  totalMarks: {
    type: Number,
    default: 0,
  },
  passingMarks: {
    type: Number,
    default: 0,
  },
  // Question settings
  randomizeQuestions: {
    type: Boolean,
    default: false,
  },
  randomizeOptions: {
    type: Boolean,
    default: false,
  },
  showQuestionNumbers: {
    type: Boolean,
    default: true,
  },
  // Calculator settings
  calculatorEnabled: {
    type: Boolean,
    default: false,
  },
  calculatorType: {
    type: String,
    enum: ['none', 'basic', 'scientific'],
    default: 'none',
  },
  // Review settings
  allowReview: {
    type: Boolean,
    default: false,
  },
  showCorrectAnswers: {
    type: Boolean,
    default: false,
  },
  showExplanations: {
    type: Boolean,
    default: false,
  },
  reviewAvailableFrom: {
    type: Date,
    default: null,
  },
  // Anti-cheating settings
  enableProctoring: {
    type: Boolean,
    default: true,
  },
  maxViolationsBeforeWarning: {
    type: Number,
    default: 3,
  },
  maxViolationsBeforeSubmit: {
    type: Number,
    default: 5,
  },
  detectTabSwitch: {
    type: Boolean,
    default: true,
  },
  detectCopyPaste: {
    type: Boolean,
    default: true,
  },
  blockRightClick: {
    type: Boolean,
    default: true,
  },
  // Batch settings for large-scale exams
  enableBatching: {
    type: Boolean,
    default: false,
  },
  batchSize: {
    type: Number,
    default: 500,
    min: 10,
    max: 1000,
  },
  batchBufferMinutes: {
    type: Number,
    default: 15,
    min: 5,
    max: 60,
  },
  // Negative marking
  negativeMarking: {
    type: Boolean,
    default: false,
  },
  negativeMarkValue: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  // Enrolled students (for batching)
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Access control
  allowedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  allowAllStudents: {
    type: Boolean,
    default: true,
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'archived'],
    default: 'draft',
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Lifecycle timestamps
  publishedAt: {
    type: Date,
    default: null,
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  activatedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  archivedAt: {
    type: Date,
    default: null,
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for questions count
examSchema.virtual('questionsCount', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'exam',
  count: true,
});

// Virtual for submissions count
examSchema.virtual('submissionsCount', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'exam',
  count: true,
});

// Indexes
examSchema.index({ status: 1 });
examSchema.index({ startTime: 1, endTime: 1 });
examSchema.index({ createdBy: 1 });
examSchema.index({ subject: 1 });

// Pre-save validation — only fix clearly invalid data, never override user-set times
examSchema.pre('save', function(next) {
  // Only auto-fix if endTime is BEFORE startTime (clearly wrong)
  // Do NOT modify times that are valid but in the past (activation handles that)
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    // Only auto-fix for new documents or if both times are being explicitly set
    if (this.isNew || (this.isModified('startTime') && this.isModified('endTime'))) {
      const durationMs = (this.duration || 60) * 60 * 1000;
      this.endTime = new Date(this.startTime.getTime() + durationMs);
    }
  }
  next();
});

// Method to check if exam is active
examSchema.methods.isActive = function() {
  const now = new Date();
  return ['published', 'ongoing'].includes(this.status) && 
         now >= this.startTime && 
         now <= this.endTime;
};

// Method to check if exam is upcoming
examSchema.methods.isUpcoming = function() {
  const now = new Date();
  return this.status === 'published' && now < this.startTime;
};

// Method to check if exam is over
examSchema.methods.isOver = function() {
  const now = new Date();
  return now > this.endTime;
};

// Method to check if review is available
examSchema.methods.isReviewAvailable = function() {
  if (!this.allowReview) return false;
  
  const now = new Date();
  
  if (this.reviewAvailableFrom) {
    return now >= this.reviewAvailableFrom;
  }
  
  return this.isOver();
};

// Static method to get active exams
examSchema.statics.getActiveExams = function() {
  const now = new Date();
  return this.find({
    status: { $in: ['published', 'ongoing'] },
    startTime: { $lte: now },
    endTime: { $gte: now },
  });
};

// Static method to get upcoming exams
examSchema.statics.getUpcomingExams = function() {
  const now = new Date();
  return this.find({
    status: 'published',
    startTime: { $gt: now },
  }).sort({ startTime: 1 });
};

const Exam = mongoose.model('Exam', examSchema);

export default Exam;
