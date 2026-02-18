import { User, AuditLog } from '../models/index.js';
import config from '../config/index.js';
import AppError from '../utils/AppError.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/* ========== SESSION CONFIGURATION ========== */
const SESSION_COOKIE_NAME = 'proctorexam_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/* ========== JWT-IN-COOKIE APPROACH (Stateless - works with Vercel) ========== */
// Instead of storing sessions in memory (which doesn't work with serverless),
// we store a JWT token in the cookie. The JWT is self-contained.

const generateSessionJWT = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentId,
      rollNumber: user.rollNumber,
      department: user.department,
      batch: user.batch,
    },
    config.jwt.accessSecret,
    { expiresIn: '24h' }
  );
};

const verifySessionJWT = (token) => {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (error) {
    return null;
  }
};

/* ========== SESSION HELPERS (for middleware compatibility) ========== */
const getSession = (sessionToken) => {
  if (!sessionToken) return null;
  const decoded = verifySessionJWT(sessionToken);
  if (!decoded) return null;
  return decoded;
};

const deleteSession = () => {
  // No-op for JWT - cookie will be cleared
};

const refreshSession = () => {
  // No-op for JWT - handled by middleware if needed
};

/* ========== COOKIE HELPER ========== */
const setSessionCookie = (res, jwtToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: SESSION_EXPIRY_MS,
    path: '/',
  });
};

const clearSessionCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 0,
    path: '/',
  });
};

/* ========== JWT TOKEN GENERATION (for backward compatibility) ========== */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry || '1d' }
  );
};

/* ========== EXPORT SESSION HELPERS FOR MIDDLEWARE ========== */
export { SESSION_COOKIE_NAME, getSession, deleteSession, refreshSession };

/* ========== REGISTER ========== */
export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, studentId, department, batch } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    if (studentId) {
      const existingStudentId = await User.findOne({ studentId });
      if (existingStudentId) {
        throw new AppError('Student ID already registered', 400);
      }
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      studentId,
      department,
      batch,
      role: 'student',
      isActive: true,
    });

    try {
      await AuditLog.log({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'user-create',
        targetType: 'user',
        targetId: user._id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success',
      });
    } catch (e) {
      console.warn('[AUDIT] Log failed:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please login.',
    });
  } catch (error) {
    next(error);
  }
};

/* ========== LOGIN ========== */
export const login = async (req, res, next) => {
  try {
    const { email, password, studentId, dob } = req.body;

    // Check for DOB-based login (student login for exams)
    if (studentId && dob) {
      return await dobLogin(req, res, next);
    }

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check if account is locked
    if (user.isLocked()) {
      const remainingMs = user.lockUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new AppError(`Account is temporarily locked. Try again in ${remainingMin} minute(s).`, 423);
    }

    // Check user is active
    if (!user.isActive) {
      throw new AppError('Account has been deactivated. Contact administrator.', 403);
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      // Increment login attempts on failure
      await user.incrementLoginAttempts();
      const attemptsLeft = Math.max(0, 5 - (user.loginAttempts + 1));

      // Audit log the failed attempt
      try {
        await AuditLog.log({
          user: user._id,
          userEmail: user.email,
          userRole: user.role,
          action: 'login',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          status: 'failure',
          details: `Failed password attempt. ${attemptsLeft} attempts remaining.`,
        });
      } catch (e) {
        console.warn('[AUDIT] Log failed:', e.message);
      }

      if (attemptsLeft > 0) {
        throw new AppError(`Invalid email or password. ${attemptsLeft} attempt(s) remaining before lockout.`, 401);
      } else {
        throw new AppError('Account locked due to too many failed attempts. Try again in 2 hours.', 423);
      }
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT token for cookie (stateless session)
    const sessionToken = generateSessionJWT(user);
    setSessionCookie(res, sessionToken);

    // Also return JWT in response for backward compatibility
    const accessToken = generateAccessToken(user);

    try {
      await AuditLog.log({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'login',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success',
      });
    } catch (e) {
      console.warn('[AUDIT] Log failed:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          studentId: user.studentId,
          rollNumber: user.rollNumber,
          department: user.department,
          batch: user.batch,
        },
        token: accessToken,
      },
    });
  } catch (error) {
    console.error('[LOGIN ERROR]', error.message);
    return next(error);
  }
};

/* ========== DOB-BASED LOGIN FOR STUDENTS ========== */
export const dobLogin = async (req, res, next) => {
  try {
    const { studentId, dob, examId } = req.body;

    if (!studentId || !dob) {
      throw new AppError('Student ID and Date of Birth are required', 400);
    }

    // Find user by studentId or rollNumber
    const user = await User.findOne({
      $or: [
        { studentId: studentId },
        { rollNumber: studentId },
        { email: studentId }
      ],
      role: 'student'
    }).select('+password');

    if (!user) {
      // Log failed attempt
      try {
        await AuditLog.log({
          action: 'login-failed',
          details: { studentId, reason: 'Student not found' },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          status: 'failure',
        });
      } catch (e) {}
      
      throw new AppError('Invalid credentials', 401);
    }

    // Check if account is locked
    if (user.isLocked && user.isLocked()) {
      throw new AppError('Account is locked. Please contact administrator.', 403);
    }

    // Validate DOB
    // Expected format: DDMMYYYY (e.g., 15061995)
    const dobString = dob.replace(/[^0-9]/g, '');
    
    if (!user.dateOfBirth) {
      // If DOB not set, try password match
      const isMatch = await user.comparePassword(dob);
      if (!isMatch) {
        if (user.incrementLoginAttempts) {
          await user.incrementLoginAttempts();
        }
        throw new AppError('Invalid credentials', 401);
      }
    } else {
      // Format user's DOB
      const userDob = new Date(user.dateOfBirth);
      const expectedDob = 
        String(userDob.getDate()).padStart(2, '0') +
        String(userDob.getMonth() + 1).padStart(2, '0') +
        String(userDob.getFullYear());
      
      if (dobString !== expectedDob) {
        if (user.incrementLoginAttempts) {
          await user.incrementLoginAttempts();
        }
        
        try {
          await AuditLog.log({
            user: user._id,
            userEmail: user.email,
            userRole: user.role,
            action: 'login-failed',
            details: { reason: 'DOB mismatch' },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'failure',
          });
        } catch (e) {}
        
        throw new AppError('Invalid credentials', 401);
      }
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // Reset login attempts on success
    if (user.resetLoginAttempts) {
      await user.resetLoginAttempts();
    }

    // Bind session to IP and browser
    const ipHash = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Check for existing active session (prevent multiple logins)
    if (user.currentSessionId && user.currentSessionIpHash !== ipHash) {
      // Different IP trying to login while session exists
      try {
        await AuditLog.log({
          user: user._id,
          userEmail: user.email,
          userRole: user.role,
          action: 'login-blocked-active-session',
          details: { 
            existingIp: user.currentSessionIpHash,
            attemptIp: ipHash
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          status: 'blocked',
        });
      } catch (e) {}
      
      throw new AppError('You are already logged in from another device. Please close that session first.', 403);
    }

    // Update user session info
    user.lastLogin = new Date();
    user.currentSessionIpHash = ipHash;
    user.currentSessionUserAgent = userAgent;
    user.currentSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    await user.save();

    // Create JWT token for cookie (stateless session)
    const sessionToken = generateSessionJWT(user);
    setSessionCookie(res, sessionToken);

    // Also generate JWT for backward compatibility
    const accessToken = generateAccessToken(user);

    try {
      await AuditLog.log({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'login-dob',
        details: { studentId, examId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success',
      });
    } catch (e) {
      console.warn('[AUDIT] Log failed:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          studentId: user.studentId,
          rollNumber: user.rollNumber,
          role: user.role,
        },
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ========== LOGOUT ========== */
export const logout = async (req, res, next) => {
  try {
    // Get session from cookie and delete it
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      deleteSession(sessionId);
    }
    
    // Clear session cookie
    clearSessionCookie(res);

    // Clear user's current session in DB if available
    if (req.user) {
      try {
        await User.findByIdAndUpdate(req.user._id, {
          $unset: { currentSessionId: 1, currentSessionIpHash: 1, currentSessionUserAgent: 1 }
        });
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/* ========== REFRESH TOKEN ========== */
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      throw new AppError('Refresh token required', 400);
    }

    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      throw new AppError('Invalid user', 401);
    }

    const accessToken = generateAccessToken(user);

    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid refresh token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Refresh token expired. Please login again.', 401));
    }
    next(error);
  }
};

/* ========== GET ME ========== */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -passwordResetToken -passwordResetExpires -loginAttempts -lockUntil');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          studentId: user.studentId,
          rollNumber: user.rollNumber,
          employeeId: user.employeeId,
          department: user.department,
          batch: user.batch,
          phone: user.phone,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ========== CHECK SESSION ========== */
export const checkSession = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Session valid',
      data: { userId: req.user._id },
    });
  } catch (error) {
    next(error);
  }
};

/* ========== SERVER TIME ========== */
export const getServerTime = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: { serverTime: Date.now() },
    });
  } catch (error) {
    next(error);
  }
};

/* ========== CHANGE PASSWORD ========== */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    try {
      await AuditLog.log({
        user: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: 'password-change',
        targetType: 'user',
        targetId: user._id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success',
      });
    } catch (e) {
      console.warn('[AUDIT] Log failed:', e.message);
    }

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/* ========== SEED DEMO DATA ========== */
export const seedDemo = async (req, res, next) => {
  try {
    const { secretKey } = req.body;
    
    // Simple security check
    if (secretKey !== 'SEED_DEMO_2026') {
      throw new AppError('Invalid secret key', 403);
    }

    const bcrypt = await import('bcryptjs');

    // Create Admin - use plain password, let User model pre-save hook hash it
    const adminExists = await User.findOne({ email: 'admin@university.edu' });
    if (!adminExists) {
      await User.create({
        email: 'admin@university.edu',
        password: 'Password@123',
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
        isActive: true,
        isVerified: true,
      });
    } else {
      // Update existing - hash manually since updateOne bypasses pre-save
      const hashedPassword = await bcrypt.default.hash('Password@123', 12);
      await User.updateOne({ email: 'admin@university.edu' }, { role: 'admin', password: hashedPassword });
    }

    // Create Teacher
    const teacherExists = await User.findOne({ email: 'teacher@university.edu' });
    if (!teacherExists) {
      await User.create({
        email: 'teacher@university.edu',
        password: 'Password@123',
        firstName: 'Demo',
        lastName: 'Teacher',
        role: 'teacher',
        isActive: true,
        isVerified: true,
      });
    }

    // Create Demo Students with DOB
    const students = [
      { studentId: 'STU001', firstName: 'Rahul', lastName: 'Sharma', dob: '2000-05-15' },
      { studentId: 'STU002', firstName: 'Priya', lastName: 'Patel', dob: '2001-03-22' },
      { studentId: 'STU003', firstName: 'Amit', lastName: 'Kumar', dob: '2000-08-10' },
      { studentId: 'STU004', firstName: 'Neha', lastName: 'Singh', dob: '2001-01-05' },
      { studentId: 'STU005', firstName: 'Vikram', lastName: 'Reddy', dob: '2000-11-30' },
    ];

    for (const s of students) {
      const exists = await User.findOne({ studentId: s.studentId });
      if (!exists) {
        await User.create({
          email: `${s.studentId.toLowerCase()}@student.university.edu`,
          password: 'Password@123',
          firstName: s.firstName,
          lastName: s.lastName,
          studentId: s.studentId,
          dateOfBirth: new Date(s.dob),
          role: 'student',
          department: 'Computer Science',
          batch: '2024',
          isActive: true,
          isVerified: true,
        });
      }
    }

    res.json({
      success: true,
      message: 'Demo data seeded successfully',
      credentials: {
        admin: { email: 'admin@university.edu', password: 'Password@123' },
        teacher: { email: 'teacher@university.edu', password: 'Password@123' },
        students: students.map(s => ({
          studentId: s.studentId,
          dob: s.dob,
          email: `${s.studentId.toLowerCase()}@student.university.edu`,
          password: 'Password@123'
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/* ========== UPDATE PROFILE ========== */
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName } = req.body;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    
    if (Object.keys(updateData).length === 0) {
      throw new AppError('No data to update', 400);
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password (stub - sends success regardless)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);
    // In production, send a password reset email here
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  dobLogin,
  logout,
  refreshToken,
  getMe,
  checkSession,
  getServerTime,
  changePassword,
  seedDemo,
  updateProfile,
  forgotPassword,
};