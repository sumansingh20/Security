import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Actor
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  userEmail: {
    type: String,
    default: null,
  },
  userRole: {
    type: String,
    default: null,
  },
  // Action
  action: {
    type: String,
    required: true,
    enum: [
      // Auth actions
      'login',
      'logout',
      'login-failed',
      'login-dob',
      'login-blocked-active-session',
      'password-change',
      'password-reset',
      'session-invalidated',
      // User actions
      'user-create',
      'user-update',
      'user-delete',
      'user-activate',
      'user-deactivate',
      // Exam actions
      'exam-create',
      'exam-update',
      'exam-delete',
      'exam-publish',
      'exam-published',
      'exam-archive',
      'exam-activated',
      'exam-completed',
      'exam-locked',
      // Question actions
      'question-create',
      'question-update',
      'question-delete',
      // Category actions
      'category-create',
      'category-update',
      'category-delete',
      // Submission actions
      'exam-start',
      'exam-submit',
      'exam-auto-submit',
      'answer-save',
      // Batch actions
      'batches-generated',
      'batch-started-manual',
      'batch-completed-locked',
      'session-force-submitted',
      'session-terminated',
      // Violation actions
      'violation-detected',
      'violation-warning',
      'violation-auto-submit',
      // System actions
      'system-error',
      'system-settings-updated',
      'rate-limit-exceeded',
    ],
  },
  // Target
  targetType: {
    type: String,
    enum: ['user', 'exam', 'question', 'submission', 'system', 'batch', 'category', 'session'],
    default: 'system',
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  // Details
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Request info
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  requestMethod: {
    type: String,
    default: null,
  },
  requestPath: {
    type: String,
    default: null,
  },
  // Status
  status: {
    type: String,
    enum: ['success', 'failure', 'warning', 'blocked'],
    default: 'success',
  },
  errorMessage: {
    type: String,
    default: null,
  },
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    // Note: indexed via TTL index below
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

// TTL index to automatically delete old logs (keep for 90 days)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to log action
auditLogSchema.statics.log = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get recent actions
auditLogSchema.statics.getRecentActions = async function(action, limit = 100) {
  return this.find({ action })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'email firstName lastName');
};

// Static method to get activity summary
auditLogSchema.statics.getActivitySummary = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { action: '$action', status: '$status' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
