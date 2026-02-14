import mongoose from "mongoose";

/**
 * MongoDB Connection Handler
 * Implements connection pooling and caching for serverless environments
 */

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

// Global cache to prevent multiple connections in serverless
declare global {
    var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
    conn: null,
    promise: null,
};

if (!global.mongooseCache) {
    global.mongooseCache = cached;
}

export async function connectDB() {
    // Return cached connection if available
    if (cached.conn) {
        return cached.conn;
    }

    // Use existing connection promise if in progress
    if (!cached.promise) {
        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error(
                "Please define the MONGODB_URI environment variable inside .env.local"
            );
        }

        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts);
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectDB;
