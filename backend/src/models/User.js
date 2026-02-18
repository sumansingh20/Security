import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    default: 'student',
  },
  studentId: {
    type: String,
    sparse: true,
    unique: true,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  employeeId: {
    type: String,
    sparse: true,
    unique: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  batch: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  rollNumber: {
    type: String,
    sparse: true,
    trim: true,
  },
  section: {
    type: String,
    trim: true,
  },
  semester: {
    type: Number,
    min: 1,
    max: 10,
  },
  profileImage: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  // Session binding fields
  currentSessionId: {
    type: String,
    default: null,
  },
  currentSessionIpHash: {
    type: String,
    default: null,
  },
  currentSessionUserAgent: {
    type: String,
    default: null,
  },
  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  // Account lockout
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for faster queries (email and studentId already indexed via unique: true)
userSchema.index({ role: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
    return;
  }

  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  await this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Static method to find by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // 🔥 ADD THIS BLOCK
  if (user.role === 'admin') {
    if (!user.isActive) user.isActive = true;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }
  // 🔥 END ADD

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  if (user.isLocked()) {
    throw new Error('Account is locked. Please try again later.');
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw new Error('Invalid credentials');
  }

  await user.resetLoginAttempts();
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
