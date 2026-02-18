import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import config from '../config/index.js';
import { AuditLog } from '../models/index.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Helmet security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// Rate limiter using Redis store
export const createRateLimiter = (options = {}) => {
  const defaultMessage = {
    success: false,
    message: 'Too many requests, please try again later.',
  };
  const defaultOptions = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: defaultMessage,
    handler: async (req, res) => {
      try {
        await AuditLog.log({
          user: req.user?._id,
          userEmail: req.user?.email,
          action: 'rate-limit-exceeded',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestPath: req.originalUrl,
          status: 'failure',
        });
      } catch (e) {
        logger.warn('Audit log failed on rate limit', e);
      }
      const msg = (options.message !== undefined ? options.message : defaultMessage);
      res.status(429).json(msg);
    },
    keyGenerator: (req) => {
      return req.user?._id?.toString() || req.ip;
    },
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Login rate limiter (reasonable limit)
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.',
  },
  keyGenerator: (req) => req.ip,
});

// API rate limiter
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

// Exam rate limiter (more lenient for auto-save)
export const examRateLimiter = createRateLimiter({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second (for auto-save)
});

// Input sanitization
export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ key, req }) => {
    logger.warn(`Sanitized input for key: ${key} from IP: ${req.ip}`);
  },
});

// XSS prevention (basic)
export const xssClean = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  
  return sanitized;
};

const sanitizeValue = (value) => {
  if (typeof value !== 'string') return value;
  
  // Remove script tags and event handlers
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
};

// CSRF protection (for form submissions)
export const csrfProtection = (req, res, next) => {
  // Skip for API requests with proper auth header
  if (req.headers.authorization) {
    return next();
  }
  
  const csrfToken = req.headers['x-csrf-token'];
  const sessionCsrf = req.session?.csrfToken;
  
  if (!csrfToken || csrfToken !== sessionCsrf) {
    return next(new AppError('Invalid CSRF token', 403));
  }
  
  next();
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?._id,
    };
    
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', log);
    } else if (config.env === 'development') {
      logger.debug('Request completed', log);
    }
  });
  
  next();
};

// Error handling middleware
export const errorHandler = async (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    path: req?.originalUrl,
    method: req?.method,
    ip: req?.ip,
    userId: req?.user?._id,
  });

  // Log to audit if server error
  if (err.statusCode >= 500) {
    try {
      await AuditLog.log({
        user: req?.user?._id,
        action: 'system-error',
        details: {
          message: err.message,
          path: req?.originalUrl,
          method: req?.method,
        },
        status: 'failure',
        errorMessage: err.message,
        ipAddress: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });
    } catch (auditErr) {
      logger.warn('Audit log failed in error handler', auditErr);
    }
  }

  // Development: send full error
  if (config.env === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors,
      stack: err.stack,
    });
  }

  // Production: send sanitized error
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Unknown error - don't leak details
  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
  });
};

// Not found handler
export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

export default {
  securityHeaders,
  createRateLimiter,
  loginRateLimiter,
  apiRateLimiter,
  examRateLimiter,
  sanitizeInput,
  xssClean,
  csrfProtection,
  requestLogger,
  errorHandler,
  notFoundHandler,
};

