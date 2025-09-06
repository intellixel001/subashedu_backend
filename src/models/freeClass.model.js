import mongoose, { Schema } from "mongoose";

const FreeClassSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    videoLink: {
      type: String,
      required: true,
    },
    instructor: {
      type: String,
      required: true,
    },
    classFor: {
      type: String,
      enum: ["hsc","ssc","job", "admission"],
      required: true,
    },
  },
  { timestamps: true }
);

export const FreeClass =
  mongoose.models.FreeClass || mongoose.model("FreeClass", FreeClassSchema);
