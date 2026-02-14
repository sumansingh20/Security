import express from 'express';
import authController from '../controllers/authController.js';
import { authenticate, validateSession } from '../middleware/auth.js';
import { validate, authSchemas } from '../middleware/validation.js';
import { loginRateLimiter } from '../middleware/security.js';

const router = express.Router();

// Public routes
router.post(
  '/register',
  loginRateLimiter,
  validate(authSchemas.register),
  authController.register
);

router.post(
  '/login',
  loginRateLimiter,
  validate(authSchemas.login),
  authController.login
);

// Forgot password
router.post('/forgot-password', loginRateLimiter, authController.forgotPassword);

// DOB-based login for students (exam portal)
router.post(
  '/dob-login',
  loginRateLimiter,
  authController.dobLogin
);

// Seed demo data (protected by secret key)
router.post('/seed-demo', authController.seedDemo);

router.post(
  '/refresh-token',
  validate(authSchemas.refreshToken),
  authController.refreshToken
);

// Protected routes
router.use(authenticate);

router.post('/logout', authController.logout);

router.get('/me', authController.getMe);

router.get('/session', validateSession, authController.checkSession);

router.get('/server-time', authController.getServerTime);

router.put(
  '/profile',
  validateSession,
  authController.updateProfile
);

router.put(
  '/change-password',
  validateSession,
  validate(authSchemas.changePassword),
  authController.changePassword
);

export default router;
