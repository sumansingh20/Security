import mongoose from 'mongoose';

const examBatchSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  batchNumber: {
    type: Number,
    required: true,
  },
  // Roll number range for this batch
  rollNumberStart: {
    type: String,
    required: true,
  },
  rollNumberEnd: {
    type: String,
    required: true,
  },
  // Or explicit student list
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  maxCapacity: {
    type: Number,
    default: 500,
  },
  currentCount: {
    type: Number,
    default: 0,
  },
  // Timing
  scheduledStart: {
    type: Date,
    required: true,
  },
  scheduledEnd: {
    type: Date,
    required: true,
  },
  actualStart: {
    type: Date,
  },
  actualEnd: {
    type: Date,
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'queued', 'active', 'completed', 'locked'],
    default: 'pending',
  },
  // Statistics
  totalEnrolled: {
    type: Number,
    default: 0,
  },
  totalAttempted: {
    type: Number,
    default: 0,
  },
  totalSubmitted: {
    type: Number,
    default: 0,
  },
  totalViolations: {
    type: Number,
    default: 0,
  },
  // Lock after completion - NO MODIFICATIONS ALLOWED
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockedAt: {
    type: Date,
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Audit
  auditLog: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: mongoose.Schema.Types.Mixed,
  }],
}, {
  timestamps: true,
});

// Compound index
examBatchSchema.index({ exam: 1, batchNumber: 1 }, { unique: true });
examBatchSchema.index({ exam: 1, status: 1 });

// Methods
examBatchSchema.methods.canAcceptStudent = function() {
  return this.status === 'active' && 
         this.currentCount < this.maxCapacity && 
         !this.isLocked;
};

examBatchSchema.methods.addStudent = async function() {
  if (!this.canAcceptStudent()) {
    return false;
  }
  this.currentCount += 1;
  await this.save();
  return true;
};

examBatchSchema.methods.start = async function(userId) {
  if (this.isLocked) {
    throw new Error('Batch is locked');
  }
  
  this.status = 'active';
  this.actualStart = new Date();
  this.auditLog.push({
    action: 'batch_started',
    performedBy: userId,
    details: { scheduledStart: this.scheduledStart },
  });
  
  await this.save();
};

examBatchSchema.methods.complete = async function(userId) {
  this.status = 'completed';
  this.actualEnd = new Date();
  this.isLocked = true;
  this.lockedAt = new Date();
  this.lockedBy = userId;
  
  this.auditLog.push({
    action: 'batch_completed_locked',
    performedBy: userId,
    details: {
      totalSubmitted: this.totalSubmitted,
      totalViolations: this.totalViolations,
    },
  });
  
  await this.save();
};

examBatchSchema.methods.updateStats = async function(stats) {
  if (this.isLocked) {
    throw new Error('Cannot update locked batch');
  }
  
  Object.assign(this, stats);
  await this.save();
};

// Static method to get next batch
examBatchSchema.statics.getNextPendingBatch = async function(examId) {
  return this.findOne({
    exam: examId,
    status: { $in: ['pending', 'queued'] },
    isLocked: false,
  }).sort({ batchNumber: 1 });
};

examBatchSchema.statics.getActiveBatch = async function(examId) {
  return this.findOne({
    exam: examId,
    status: 'active',
    isLocked: false,
  });
};

const ExamBatch = mongoose.model('ExamBatch', examBatchSchema);
export default ExamBatch;
