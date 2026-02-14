import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

const connectDB = async () => {
  // Return cached connection if exists
  if (cached.conn) {
    return cached.conn;
  }

  // Check for MongoDB URI
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Don't allow localhost in production
  if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI.includes('localhost')) {
    throw new Error('Cannot use localhost MongoDB in production. Use MongoDB Atlas.');
  }

  if (!cached.promise) {
    const options = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    };

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, options)
      .then((mongooseInstance) => {
        console.log('[DB] MongoDB connected successfully');
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        console.error('[DB] MongoDB connection failed:', err.message);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
};

export default connectDB;
