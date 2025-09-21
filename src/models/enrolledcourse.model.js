import mongoose, { Schema } from "mongoose";

const EnrollCourseSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    userid: {
      type: String,
      required: true,
    },
    materials: {
      type: [mongoose.Types.ObjectId],
      ref: "Material",
      default: [],
    },
    tranjectionid: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["paid", "free"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["bkash", "nagad", "roket"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      required: true,
    },
    enrollcourse: {
      type: [],
      required: true,
      default: [],
    },
  },
  { timestamps: true }
);

export const EnrollCourse =
  mongoose.models.EnrollCourse ||
  mongoose.model("EnrollCourse", EnrollCourseSchema);
