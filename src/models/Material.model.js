// import mongoose from "mongoose";

// const materialSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     contentUrl: {
//       type: String,
//       required: true,
//     },
//     forCourses: {
//       type: [mongoose.Schema.Types.ObjectId],
//       ref: "Course",
//       required: false,
//     },
//     price: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     publicId: {
//       type: String,
//       required: true,
//     },
//     accessControl: {
//       type: String,
//       enum: ["purchased", "free", "restricted"],
//       default: "restricted",
//     },
//   },
//   { timestamps: true }
// );

// export const Material =
//   mongoose.models.Material || mongoose.model("Material", materialSchema);

import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    pdfs: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    forCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    price: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    accessControl: {
      type: String,
      enum: ["purchased", "free", "restricted"],
      default: "restricted",
    },
  },
  { timestamps: true }
);

export const Material =
  mongoose.models.Material || mongoose.model("Material", materialSchema);
