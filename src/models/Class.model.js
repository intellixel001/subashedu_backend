import mongoose, { Schema } from "mongoose";

const ClassSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    instructorId: {
      type: mongoose.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    courseType: {
      type: String,
      enum: ["class", "admission", "job"],
      required: true,
    },
    billingType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },
    type: {
      type: String,
      enum: ["recorded", "live"],
      required: true,
    },
    videoLink: {
      type: String,
      required: function () {
        return this.type === "recorded" || this.type === "live";
      },
      trim: true,
    },
    startTime: {
      type: Date,
      required: function () {
        return this.type === "live";
      },
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
