import mongoose from "mongoose";
import dns from "node:dns/promises";
import { MongoConnectionError } from "@/lib/database/errors";

// The MongoDB driver uses the promise resolver for Atlas SRV and TXT lookups.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = (
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  ""
)
  .trim()
  .replace(/^['"]|['"]$/g, "");

export function getMongoConnectionDiagnostics() {
  return {
    isConfigured: Boolean(MONGODB_URI),
    isAtlasUri: /mongodb\+srv:\/\//i.test(MONGODB_URI),
    usesLocalhost: /localhost|127\.0\.0\.1/i.test(MONGODB_URI),
    envSource: process.env.MONGODB_URI
      ? "MONGODB_URI"
      : process.env.MONGODB_URL
        ? "MONGODB_URL"
        : process.env.DATABASE_URL
          ? "DATABASE_URL"
          : "not configured",
  };
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached = globalThis.mongooseCache ?? { conn: null, promise: null };
if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cached;
}

export async function connectToDatabase() {
  const diagnostics = getMongoConnectionDiagnostics();
  if (!MONGODB_URI) {
    console.error("MongoDB configuration is missing.", diagnostics);
    throw new MongoConnectionError("configuration");
  }

  if (/localhost|127\.0\.0\.1/i.test(MONGODB_URI)) {
    console.error("MongoDB configuration is invalid for this deployment.", diagnostics);
    throw new MongoConnectionError("configuration");
  }

  try {
    if (mongoose.connection.readyState === 1) {
      cached.conn = mongoose;
      return cached.conn;
    }

    if (mongoose.connection.readyState === 2) {
      cached.conn = null;
      cached.promise ??= mongoose.connection.asPromise().then(() => mongoose);
    } else {
      cached.conn = null;
      cached.promise = null;
      cached.promise = mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        autoIndex: true,
      });
    }

    cached.conn = await cached.promise;
    cached.promise = null;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorCode =
      error && typeof error === "object" && "code" in error &&
      (typeof error.code === "string" || typeof error.code === "number")
        ? error.code
        : undefined;

    console.error("MongoDB connection failed:", {
      ...diagnostics,
      errorName,
      errorCode,
    });
    throw new MongoConnectionError("unavailable");
  }
}
