import mongoose from 'mongoose';

const examSessionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  batch: {
    type: Number,
    required: true,
  },
  // Session binding for security
  sessionToken: {
    type: String,
    required: true,
    unique: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  browserFingerprint: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
  },
  // Timing
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  serverEndTime: {
    type: Date,
    required: true,
  },
  submittedAt: {
    type: Date,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'submitted', 'force_submitted', 'expired', 'violation_terminated'],
    default: 'active',
  },
  // Answers stored server-side
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
    },
    selectedOption: Number,
    textAnswer: String,
    answeredAt: Date,
    timeTaken: Number, // seconds spent on this question
  }],
  currentQuestionIndex: {
    type: Number,
    default: 0,
  },
  // Violations
  violations: [{
    type: {
      type: String,
      enum: [
        'tab_switch',
        'window_blur',
        'copy_attempt',
        'paste_attempt',
        'right_click',
        'dev_tools',
        'multiple_login',
        'ip_change',
        'browser_change',
        'back_navigation',
        'refresh_attempt',
        'screenshot_attempt',
        'screen_share_detected',
        'fingerprint_mismatch',
        'connection_lost',
        'inactivity',
        'other'
      ],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: String,
    ipAddress: String,
  }],
  violationCount: {
    type: Number,
    default: 0,
  },
  maxViolationsAllowed: {
    type: Number,
    default: 3,
  },
  // Auto-save tracking
  autoSaveCount: {
    type: Number,
    default: 0,
  },
  lastAutoSave: {
    type: Date,
  },
  // Grading
  score: {
    type: Number,
    default: 0,
  },
  totalMarks: {
    type: Number,
    default: 0,
  },
  correctCount: {
    type: Number,
    default: 0,
  },
  wrongCount: {
    type: Number,
    default: 0,
  },
  questionsAttempted: {
    type: Number,
    default: 0,
  },
  // Audit
  auditLog: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
  }],
}, {
  timestamps: true,
});

// Indexes for performance
examSessionSchema.index({ exam: 1, student: 1 });
examSessionSchema.index({ exam: 1, batch: 1 });
// sessionToken already has unique index from schema definition
examSessionSchema.index({ status: 1 });
examSessionSchema.index({ serverEndTime: 1 });

// Methods
examSessionSchema.methods.addViolation = async function(type, details, ipAddress) {
  this.violations.push({
    type,
    details,
    ipAddress,
    timestamp: new Date(),
  });
  this.violationCount += 1;
  
  this.auditLog.push({
    action: 'violation_recorded',
    details: { type, details },
    ipAddress,
  });
  
  // Auto-terminate if max violations exceeded
  if (this.violationCount >= this.maxViolationsAllowed) {
    this.status = 'violation_terminated';
    this.submittedAt = new Date();
    this.auditLog.push({
      action: 'session_terminated_violations',
      details: { totalViolations: this.violationCount },
      ipAddress,
    });
  }
  
  await this.save();
  return this.violationCount >= this.maxViolationsAllowed;
};

examSessionSchema.methods.saveAnswer = async function(questionId, answer, ipAddress) {
  const existingIndex = this.answers.findIndex(
    a => a.questionId.toString() === questionId.toString()
  );
  
  const answerData = {
    questionId,
    answeredAt: new Date(),
    ...answer,
  };
  
  if (existingIndex >= 0) {
    this.answers[existingIndex] = { ...this.answers[existingIndex].toObject(), ...answerData };
  } else {
    this.answers.push(answerData);
  }
  
  this.lastActivityAt = new Date();
  this.autoSaveCount += 1;
  this.lastAutoSave = new Date();
  
  await this.save();
};

examSessionSchema.methods.getRemainingTime = function() {
  const now = new Date();
  const remaining = this.serverEndTime.getTime() - now.getTime();
  return Math.max(0, Math.floor(remaining / 1000));
};

examSessionSchema.methods.isExpired = function() {
  return new Date() > this.serverEndTime;
};

examSessionSchema.methods.forceSubmit = async function(reason, ipAddress) {
  this.status = 'force_submitted';
  this.submittedAt = new Date();
  this.auditLog.push({
    action: 'force_submit',
    details: { reason },
    ipAddress,
  });
  await this.save();
};

examSessionSchema.methods.submit = async function(ipAddress) {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.auditLog.push({
    action: 'submitted',
    details: { answeredQuestions: this.answers.length },
    ipAddress,
  });
  await this.save();
};

// Static methods
examSessionSchema.statics.getActiveSessionsCount = async function(examId, batch) {
  return this.countDocuments({
    exam: examId,
    batch,
    status: 'active',
  });
};

examSessionSchema.statics.findActiveSession = async function(examId, studentId) {
  return this.findOne({
    exam: examId,
    student: studentId,
    status: 'active',
  });
};

examSessionSchema.statics.validateSession = async function(sessionToken, ipAddress, fingerprint) {
  const session = await this.findOne({ sessionToken, status: 'active' });
  
  if (!session) {
    return { valid: false, reason: 'session_not_found' };
  }
  
  if (session.isExpired()) {
    await session.forceSubmit('time_expired', ipAddress);
    return { valid: false, reason: 'session_expired' };
  }
  
  // Strict IP check - log violation but allow (IP can change on mobile/VPN)
  if (session.ipAddress !== ipAddress) {
    await session.addViolation('ip_change', `IP changed from ${session.ipAddress} to ${ipAddress}`, ipAddress);
    // Update the stored IP to avoid repeated violations
    session.ipAddress = ipAddress;
    await session.save();
  }
  
  // Browser fingerprint check
  if (session.browserFingerprint !== fingerprint) {
    await session.addViolation('browser_change', 'Browser fingerprint changed', ipAddress);
    return { valid: false, reason: 'browser_mismatch' };
  }
  
  return { valid: true, session };
};

const ExamSession = mongoose.model('ExamSession', examSessionSchema);
export default ExamSession;
