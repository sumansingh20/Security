import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';

import connectDB from './config/database.js';
import routes from './routes/index.js';
import User from './models/User.js';

const app = express();

/* ========== CRITICAL: ERROR JSON RESPONSE ========== */
const errorJson = (res, status, message, details = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  };
  if (details) response.details = details;
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
    response.debug = true;
  }
  return res.status(status).json(response);
};

/* ========== CORS ALLOWED ORIGINS ========== */
const ALLOWED_ORIGINS = [
  'https://proctorexam.vercel.app',
  'https://proctoredexam.vercel.app',
  'https://proctorexam-red.vercel.app',
  'https://proctorexam-frontend.vercel.app',
  'https://security-wine-nine.vercel.app',
  'https://security-api-new.vercel.app',
  'https://moodle-security.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

// Add any custom origin from env
if (process.env.CORS_ORIGIN && !ALLOWED_ORIGINS.includes(process.env.CORS_ORIGIN)) {
  ALLOWED_ORIGINS.push(process.env.CORS_ORIGIN);
}
// Add frontend URL from env
if (process.env.FRONTEND_URL && !ALLOWED_ORIGINS.includes(process.env.FRONTEND_URL)) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}

/* ========== CORS HEADERS FUNCTION ========== */
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  
  // CRITICAL: For credentials to work, we MUST set a specific origin, not '*'
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin && origin.endsWith('.vercel.app')) {
    // Allow ALL Vercel preview deployments
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin && process.env.NODE_ENV !== 'production') {
    // In development, allow any origin for easier testing
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // For same-origin requests or curl - use first allowed origin
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || 'https://proctorexam.vercel.app');
  } else {
    // Unknown origin — still set it to avoid browser CORS block
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || 'https://proctorexam.vercel.app');
  }
  
  // CRITICAL: Must be true for cookies to be sent/received
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Cookie');
  res.setHeader('Access-Control-Max-Age', '86400');
  // Allow cookies to be exposed to frontend
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
};

/* ========== MIDDLEWARE ========== */
app.set('trust proxy', 1);

// CRITICAL: Handle OPTIONS preflight FIRST before any other middleware
app.options('*', (req, res) => {
  setCorsHeaders(req, res);
  res.status(204).end();
});

// Apply CORS headers to ALL requests
app.use((req, res, next) => {
  setCorsHeaders(req, res);
  next();
});

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(compression());

/* ========== HEALTH CHECK (NO DB REQUIRED) ========== */
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'ProctoredExam API',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'ProctoredExam API',
    mongodb: process.env.MONGODB_URI ? 'configured' : 'missing',
    timestamp: new Date().toISOString(),
  });
});

// Reset demo users - unlocks accounts and sets studentId/DOB
app.get('/api/reset-demo', async (req, res) => {
  try {
    await initializeDB();
    
    // Reset ALL demo accounts (unlock them)
    const allDemoUsers = [
      'admin@proctorexam.com',
      'teacher@proctorexam.com',
      'student@proctorexam.com',
      'demo.student@proctorexam.com',
    ];
    
    // Unlock all demo users first
    await User.updateMany(
      { email: { $in: allDemoUsers } },
      { $set: { isActive: true, loginAttempts: 0 }, $unset: { lockUntil: 1 } }
    );
    
    // Force unlock and update demo student accounts with studentId/DOB
    const demoStudents = [
      { email: 'student@proctorexam.com', studentId: 'STU001', dob: new Date('2000-01-01') },
      { email: 'demo.student@proctorexam.com', studentId: 'STU002', dob: new Date('2001-05-15') },
    ];
    
    const results = [];
    for (const demo of demoStudents) {
      try {
        // First clear studentId from any other user that might have it
        await User.updateMany(
          { studentId: demo.studentId, email: { $ne: demo.email } },
          { $unset: { studentId: 1 } }
        );
        
        // Now update the correct user
        const result = await User.updateOne(
          { email: demo.email },
          { 
            $set: { 
              studentId: demo.studentId, 
              dateOfBirth: demo.dob,
              isActive: true,
              loginAttempts: 0
            },
            $unset: { lockUntil: 1 }
          }
        );
        results.push({ email: demo.email, updated: result.modifiedCount > 0 });
      } catch (e) {
        results.push({ email: demo.email, error: e.message });
      }
    }
    
    res.json({ success: true, message: 'Demo users reset', results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

/* ========== DB CONNECTION + AUTO SEED USERS ========== */
let dbInitialized = false;
let dbError = null;

const initializeDB = async () => {
  if (dbInitialized) return true;
  if (dbError) {
    // Allow retry after 10 seconds
    dbError = null;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await connectDB();

    // AUTO-CREATE USERS (always, not just DEMO_MODE)
    const users = [
      {
        email: 'admin@proctorexam.com',
        password: 'Admin@123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true,
        isVerified: true,
      },
      {
        email: 'teacher@proctorexam.com',
        password: 'Teacher@123',
        firstName: 'Demo',
        lastName: 'Teacher',
        role: 'teacher',
        isActive: true,
        isVerified: true,
      },
      {
        email: 'student@proctorexam.com',
        password: 'Student@123',
        firstName: 'Test',
        lastName: 'Student',
        role: 'student',
        studentId: 'STU001',
        dateOfBirth: new Date('2000-01-01'),
        isActive: true,
        isVerified: true,
      },
      {
        email: 'demo.student@proctorexam.com',
        password: 'Demo@123',
        firstName: 'Demo',
        lastName: 'Student',
        role: 'student',
        studentId: 'STU002',
        dateOfBirth: new Date('2001-05-15'),
        isActive: true,
        isVerified: true,
      },
    ];

    for (const userData of users) {
      try {
        // Try to find existing user by email
        const exists = await User.findOne({ email: userData.email });
        
        if (!exists) {
          // Create new user
          await User.create(userData);
          console.log(`[SEED] User created: ${userData.email}`);
        } else {
          // ALWAYS update for demo users - fix studentId, DOB, unlock account
          let needsSave = false;
          
          // Unlock account if locked
          if (exists.loginAttempts > 0 || exists.lockUntil) {
            exists.loginAttempts = 0;
            exists.lockUntil = undefined;
            needsSave = true;
          }
          
          // Ensure active
          if (!exists.isActive) {
            exists.isActive = true;
            needsSave = true;
          }
          
          // Update studentId and DOB
          if (userData.studentId && exists.studentId !== userData.studentId) {
            exists.studentId = userData.studentId;
            needsSave = true;
          }
          if (userData.dateOfBirth && (!exists.dateOfBirth || exists.dateOfBirth.getTime() !== userData.dateOfBirth.getTime())) {
            exists.dateOfBirth = userData.dateOfBirth;
            needsSave = true;
          }
          if (needsSave) {
            await exists.save();
            console.log(`[SEED] User updated: ${userData.email} - studentId: ${userData.studentId}`);
          }
        }
      } catch (e) {
        console.log(`[SEED] User error: ${userData.email} - ${e.message}`);
      }
    }

    dbInitialized = true;
    return true;
  } catch (err) {
    dbError = err;
    console.error('[DB] Initialization failed:', err.message);
    throw err;
  }
};

/* ========== DB MIDDLEWARE ========== */
app.use(async (req, res, next) => {
  // Skip DB for health endpoints
  if (req.path === '/' || req.path === '/api/health' || req.path === '/favicon.ico') {
    return next();
  }

  try {
    await initializeDB();
    next();
  } catch (err) {
    return errorJson(res, 503, `Database connection failed: ${err.message}`);
  }
});

/* ========== API ROUTES ========== */
app.use('/api', routes);

/* ========== 404 HANDLER ========== */
app.use((req, res) => {
  return errorJson(res, 404, `Route not found: ${req.method} ${req.path}`);
});

/* ========== ERROR HANDLER ========== */
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error('[STACK]', err.stack);

  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose ValidationError (required fields, enum, etc.)
  if (err.name === 'ValidationError') {
    status = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = `Validation failed: ${messages.join(', ')}`;
  }

  // MongoDB duplicate key error (E11000)
  if (err.code === 11000 || err.code === 11001) {
    status = 409;
    const field = Object.keys(err.keyValue || {}).join(', ') || 'field';
    message = `Duplicate value for ${field}. This ${field} already exists.`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired. Please log in again.';
  }

  return errorJson(res, status, message, {
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
});

/* ========== SERVER STARTUP ========== */
const PORT = process.env.PORT || 5000;

// Only start server if NOT running on Vercel (serverless)
if (!process.env.VERCEL) {
  const httpServer = createServer(app);

  // Initialize Socket.IO for real-time monitoring
  try {
    const { Server } = await import('socket.io');
    const { setupExamSocket } = await import('./socket/examMonitorSocket.js');

    const io = new Server(httpServer, {
      cors: {
        origin: ALLOWED_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    setupExamSocket(io);
    console.log('[SOCKET.IO] Real-time monitoring initialized');
  } catch (socketErr) {
    console.warn('[SOCKET.IO] Failed to initialize:', socketErr.message);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] ProctorExam API running on port ${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SERVER] Health check: http://localhost:${PORT}/api/health`);
  });

  // Error handling
  httpServer.on('error', (err) => {
    console.error('[SERVER ERROR]', err);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('[SERVER] SIGTERM received, shutting down...');
    httpServer.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('[SERVER] SIGINT received, shutting down...');
    httpServer.close(() => process.exit(0));
  });
}

// Export for Vercel serverless
export default app;