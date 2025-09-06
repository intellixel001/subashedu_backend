import mongoose, { Schema } from "mongoose";

const NoticeSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      default: "",
    },
  },
  { timestamps: true }
);

export const Notice =
  mongoose.models.Notice || mongoose.model("Notice", NoticeSchema);
