import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"; // Fixed: Added .js extension

const connectDb = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\nDATABASE connected !! DB host : ${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.log("MongoDB connection FAILED!", err); // Fixed: Corrected variable name to err
    process.exit(1);
  }
};

export default connectDb;
