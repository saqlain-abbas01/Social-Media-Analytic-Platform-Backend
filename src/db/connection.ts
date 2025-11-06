import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL!);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1); // Stop the app if DB connection fails
  }
};
