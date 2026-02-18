import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema({
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    default: null,
    index: true,
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Violation details
  type: {
    type: String,
    enum: [
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
      'failed_login',
      'tab_switch',
      'window_blur',
      'copy_attempt',
      'paste_attempt',
      'right_click',
      'dev_tools',
      'ip_change',
      'browser_change',
      'fingerprint_mismatch',
      'connection_lost',
      'inactivity',
      'navigation',
      'other',
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  description: {
    type: String,
    default: '',
  },
  // Metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  questionNumber: {
    type: Number,
    default: null,
  },
  // Client info
  userAgent: {
    type: String,
    default: null,
  },
  screenResolution: {
    type: String,
    default: null,
  },
  // Server-side flag
  acknowledged: {
    type: Boolean,
    default: false,
  },
  warningShown: {
    type: Boolean,
    default: false,
  },
  // Action taken
  actionTaken: {
    type: String,
    enum: ['none', 'warning', 'auto-submit'],
    default: 'none',
  },
}, {
  timestamps: true,
});

// Compound indexes
violationSchema.index({ submission: 1, timestamp: -1 });
violationSchema.index({ exam: 1, student: 1 });

// Static method to get violation count
violationSchema.statics.getViolationCount = async function(submissionId) {
  return this.countDocuments({ submission: submissionId });
};

// Static method to get violations by type
violationSchema.statics.getViolationsByType = async function(submissionId) {
  return this.aggregate([
    { $match: { submission: new mongoose.Types.ObjectId(submissionId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
};

// Static method to get recent violations
violationSchema.statics.getRecentViolations = async function(submissionId, limit = 10) {
  return this.find({ submission: submissionId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to check if should auto-submit
violationSchema.statics.shouldAutoSubmit = async function(submissionId, threshold) {
  const count = await this.countDocuments({ submission: submissionId });
  return count >= threshold;
};

// Static method to get exam violation summary
violationSchema.statics.getExamViolationSummary = async function(examId) {
  return this.aggregate([
    { $match: { exam: new mongoose.Types.ObjectId(examId) } },
    {
      $group: {
        _id: '$student',
        totalViolations: { $sum: 1 },
        types: { $addToSet: '$type' },
        lastViolation: { $max: '$timestamp' },
      },
    },
    { $sort: { totalViolations: -1 } },
  ]);
};

const Violation = mongoose.model('Violation', violationSchema);

export default Violation;
