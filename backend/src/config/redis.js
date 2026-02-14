import Redis from 'ioredis';
import config from './index.js';
import logger from '../utils/logger.js';

/* ========== VERCEL DETECTION ========== */
const isVercel = process.env.VERCEL === '1';

class RedisClient {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;

    // In-memory fallback (works everywhere, including Vercel)
    this.memoryStore = new Map();
    this.memoryExpiry = new Map();
  }

  async connect() {
    // On Vercel, don't even try to connect to Redis
    if (isVercel) {
      logger.info('[REDIS] Vercel detected - using in-memory store');
      this.isConnected = false;
      return;
    }

    // Skip if no Redis URL configured
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      logger.info('[REDIS] No Redis URL configured - using in-memory store');
      this.isConnected = false;
      return;
    }

    try {
      await this._connectRedis();
      this.isConnected = true;
      logger.info('[REDIS] Connected successfully');
    } catch (error) {
      logger.warn('[REDIS] Connection failed, using in-memory fallback:', error.message);
      this.isConnected = false;
      // DON'T throw - just use in-memory fallback
    }
  }

  async _connectRedis() {
    let redisOptions;

    // ✅ Railway / Production (REDIS_URL)
    if (process.env.REDIS_URL) {
      redisOptions = {
        url: process.env.REDIS_URL,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 5000,
      };
    }
    // ✅ Local / Docker / Legacy config
    else {
      redisOptions = {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 5000,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
      };

      if (config.redis.password) {
        redisOptions.password = config.redis.password;
      }
    }

    this.client = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);
    this.publisher = new Redis(redisOptions);

    const errorHandler = (err) => {
      if (config.env === 'production') {
        logger.error('Redis error:', err);
      }
    };

    this.client.on('error', errorHandler);
    this.subscriber.on('error', errorHandler);
    this.publisher.on('error', errorHandler);

    // ioredis connects on first command when lazyConnect is true; ping() establishes connection
    await Promise.all([
      this.client.ping(),
      this.subscriber.ping(),
      this.publisher.ping(),
    ]);
  }

  /* ================= INTERNAL ================= */

  _cleanupExpired() {
    const now = Date.now();
    for (const [key, expiry] of this.memoryExpiry) {
      if (expiry && expiry < now) {
        this.memoryStore.delete(key);
        this.memoryExpiry.delete(key);
      }
    }
  }

  /* ================= SESSION ================= */

  async setSession(userId, sessionData, ttl = 86400) {
    const key = `session:${userId}`;
    if (this.isConnected) {
      await this.client.setex(key, ttl, JSON.stringify(sessionData));
    } else {
      this.memoryStore.set(key, JSON.stringify(sessionData));
      this.memoryExpiry.set(key, Date.now() + ttl * 1000);
    }
  }

  async getSession(userId) {
    const key = `session:${userId}`;
    if (this.isConnected) {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    }
    this._cleanupExpired();
    const data = this.memoryStore.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId) {
    const key = `session:${userId}`;
    if (this.isConnected) {
      await this.client.del(key);
    } else {
      this.memoryStore.delete(key);
      this.memoryExpiry.delete(key);
    }
  }

  /* ================= EXAM STATE ================= */

  async setExamState(examSessionId, state, ttl = 86400) {
    const key = `exam:${examSessionId}`;
    if (this.isConnected) {
      await this.client.setex(key, ttl, JSON.stringify(state));
    } else {
      this.memoryStore.set(key, JSON.stringify(state));
      this.memoryExpiry.set(key, Date.now() + ttl * 1000);
    }
  }

  async getExamState(examSessionId) {
    const key = `exam:${examSessionId}`;
    if (this.isConnected) {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    }
    this._cleanupExpired();
    const data = this.memoryStore.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateExamAnswer(examSessionId, questionId, answer) {
    const key = `exam:${examSessionId}:answers`;
    if (this.isConnected) {
      await this.client.hset(key, questionId, JSON.stringify(answer));
      await this.client.expire(key, 86400);
    } else {
      let answers = this.memoryStore.get(key) || {};
      if (typeof answers === 'string') answers = JSON.parse(answers);
      answers[questionId] = answer;
      this.memoryStore.set(key, answers);
      this.memoryExpiry.set(key, Date.now() + 86400 * 1000);
    }
  }

  async getExamAnswers(examSessionId) {
    const key = `exam:${examSessionId}:answers`;
    if (this.isConnected) {
      const answers = await this.client.hgetall(key);
      const parsed = {};
      for (const [qId, ans] of Object.entries(answers)) {
        parsed[qId] = JSON.parse(ans);
      }
      return parsed;
    }
    this._cleanupExpired();
    return this.memoryStore.get(key) || {};
  }

  async deleteExamState(examSessionId) {
    if (this.isConnected) {
      await this.client.del(`exam:${examSessionId}`, `exam:${examSessionId}:answers`);
    } else {
      this.memoryStore.delete(`exam:${examSessionId}`);
      this.memoryStore.delete(`exam:${examSessionId}:answers`);
    }
  }

  /* ================= VIOLATIONS ================= */

  async incrementViolation(examSessionId) {
    const key = `violations:${examSessionId}`;
    if (this.isConnected) {
      const count = await this.client.incr(key);
      await this.client.expire(key, 86400);
      return count;
    }
    const current = (this.memoryStore.get(key) || 0) + 1;
    this.memoryStore.set(key, current);
    this.memoryExpiry.set(key, Date.now() + 86400 * 1000);
    return current;
  }

  async getViolationCount(examSessionId) {
    const key = `violations:${examSessionId}`;
    if (this.isConnected) {
      const count = await this.client.get(key);
      return parseInt(count) || 0;
    }
    return this.memoryStore.get(key) || 0;
  }

  /* ================= RATE LIMIT ================= */

  async checkRateLimit(identifier, limit, windowSec) {
    if (!this.isConnected) return true;
    const key = `ratelimit:${identifier}`;
    const current = await this.client.incr(key);
    if (current === 1) await this.client.expire(key, windowSec);
    return current <= limit;
  }

  /* ================= TOKEN BLACKLIST ================= */

  async blacklistToken(token, ttl) {
    const key = `blacklist:${token}`;
    if (this.isConnected) {
      await this.client.setex(key, ttl, '1');
    } else {
      this.memoryStore.set(key, '1');
      this.memoryExpiry.set(key, Date.now() + ttl * 1000);
    }
  }

  async isTokenBlacklisted(token) {
    const key = `blacklist:${token}`;
    if (this.isConnected) {
      return (await this.client.exists(key)) === 1;
    }
    this._cleanupExpired();
    return this.memoryStore.has(key);
  }

  /* ================= TIME ================= */

  async getServerTime() {
    if (this.isConnected) {
      const [sec, micro] = await this.client.time();
      return parseInt(sec) * 1000 + Math.floor(parseInt(micro) / 1000);
    }
    return Date.now();
  }

  async disconnect() {
    if (this.isConnected) {
      await Promise.all([
        this.client?.quit(),
        this.subscriber?.quit(),
        this.publisher?.quit(),
      ]);
    }
    this.memoryStore.clear();
    this.memoryExpiry.clear();
  }
}

const redisClient = new RedisClient();
export default redisClient;