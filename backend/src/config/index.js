import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load .env ONLY in local/dev
 * Vercel / Railway already inject env vars
 */
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  host: process.env.HOST || '0.0.0.0',

  /* ---------------- MongoDB ---------------- */
  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      'mongodb://127.0.0.1:27017/proctorexam',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  /* ---------------- Redis ---------------- */
  redis: process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB) || 0,
      },

  /* ---------------- JWT ---------------- */
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  /* ---------------- Session ---------------- */
  session: {
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
  },

  /* ---------------- CORS ---------------- */
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  /* ---------------- Rate Limit ---------------- */
  rateLimit: {
    windowMs:
      Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max:
      Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  /* ---------------- Uploads ---------------- */
  upload: {
    maxSize:
      Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    dir:
      process.env.UPLOAD_DIR ||
      (process.env.VERCEL ? '/tmp/uploads' : './uploads'),
  },

  /* ---------------- Logging ---------------- */
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || null, // ❗ no file logging on Vercel
  },

  /* ---------------- Autosave ---------------- */
  autosave: {
    interval:
      Number(process.env.AUTOSAVE_INTERVAL) || 5000,
  },

  /* ---------------- Violations ---------------- */
  violations: {
    maxWarning:
      Number(process.env.MAX_VIOLATIONS_WARNING) || 3,
    maxSubmit:
      Number(process.env.MAX_VIOLATIONS_SUBMIT) || 5,
  },

  /* ---------------- Exam ---------------- */
  exam: {
    defaultDuration:
      Number(process.env.DEFAULT_EXAM_DURATION) || 180,
    maxDuration:
      Number(process.env.MAX_EXAM_DURATION) || 480,
  },
};

export default config;
