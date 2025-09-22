import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"; // Fixed: Added .js extension

const connectDb = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
  } catch (err) {
    process.exit(1);
  }
};

export default connectDb;
