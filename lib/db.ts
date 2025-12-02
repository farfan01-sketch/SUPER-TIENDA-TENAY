import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("⚠️ Debes definir MONGODB_URI en tu archivo .env.local");
}

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached = (global as any).mongoose as GlobalMongoose | undefined;

if (!cached) {
  cached = { conn: null, promise: null };
  (global as any).mongoose = cached;
}

export async function connectDB() {
  if (cached!.conn) return cached!.conn;

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}
