import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';
import { User } from '../models/index.js';
import AppError from '../utils/AppError.js';

// Import session helpers from authController
import { SESSION_COOKIE_NAME, getSession, refreshSession } from '../controllers/authController.js';

/* ========== TOKEN GENERATION ========== */
export const generateAccessToken = (user) => {
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

export const generateRefreshToken = (user, sessionId) => {
  return jwt.sign(
    {
      id: user._id,
      sessionId,
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry || '7d' }
  );
};

export const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashIp = (ip) => {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').substring(0, 16);
};

/* ========== AUTHENTICATE MIDDLEWARE ========== */
// Supports both cookie-based sessions and JWT Bearer tokens for backward compatibility
export const authenticate = async (req, res, next) => {
  try {
    let userId = null;
    let sessionData = null;

    // PRIORITY 1: Check for session cookie (preferred, more secure)
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      sessionData = getSession(sessionId);
      if (sessionData) {
        userId = sessionData.userId;
        // Refresh session on activity
        refreshSession(sessionId);
      }
    }

    // PRIORITY 2: Fall back to Bearer token (for API clients, backward compatibility)
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, config.jwt.accessSecret);
          userId = decoded.id;
        } catch (err) {
          // Token invalid - will fail below if no session either
        }
      }
    }

    // No valid session or token
    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    // Get user from database
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // Attach user and session to request
    req.user = user;
    req.sessionData = sessionData;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

/* ========== AUTHORIZE MIDDLEWARE ========== */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Not authorized to access this resource', 403));
    }

    next();
  };
};

/* ========== SESSION VALIDATION (NO-OP without Redis) ========== */
export const validateSession = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    // Without Redis, we trust the JWT
    next();
  } catch (error) {
    next(error);
  }
};

/* ========== SESSION MANAGEMENT (NO-OP without Redis) ========== */
export const invalidateSession = async (userId, reason = 'Logged out') => {
  // Without Redis, logout is handled client-side by deleting token
  console.log(`[SESSION] Invalidate requested for user ${userId}: ${reason}`);
};

export const createSession = async (user, ipAddress, userAgent) => {
  // Without Redis, we just return a session ID for JWT
  const sessionId = generateSessionId();

  // Update user last login
  await User.findByIdAndUpdate(user._id, {
    lastLogin: new Date(),
  });

  return sessionId;
};

export const refreshSessionActivity = async (userId) => {
  // Without Redis, no-op
  console.log(`[SESSION] Activity refresh for user ${userId}`);
};

// Aliases for backward compatibility
export const protect = authenticate;
export const restrictTo = authorize;

export default {
  authenticate,
  authorize,
  protect,
  restrictTo,
  validateSession,
  generateAccessToken,
  generateRefreshToken,
  generateSessionId,
  hashIp,
  invalidateSession,
  createSession,
  refreshSessionActivity,
};
