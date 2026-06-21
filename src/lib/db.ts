import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  // We will run in JSON file-based database fallback mode
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ MONGODB_URI is not defined. Using local JSON database (data/db/*) fallback.');
  }
}

// Global Mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCached: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCached || { conn: null, promise: null };

if (!global.mongooseCached) {
  global.mongooseCached = cached;
}

export async function connectDB(): Promise<boolean> {
  if (!MONGODB_URI) {
    return false; // Tells the repository to use JSON fallback
  }

  if (cached.conn) {
    return true;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log('🔌 Connected to MongoDB successfully.');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return true;
  } catch (e) {
    cached.promise = null;
    console.error('❌ Failed to connect to MongoDB, falling back to local JSON database.', e);
    return false;
  }
}
