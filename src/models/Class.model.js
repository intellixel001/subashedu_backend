import mongoose, { Schema } from "mongoose";

const ClassSchema = new Schema(
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
    course: {
      type: mongoose.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    isActiveLive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Class =
  mongoose.models.Class || mongoose.model("Class", ClassSchema);
