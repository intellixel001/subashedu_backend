import mongoose, { Schema } from "mongoose";

const courseSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    short_description: {
      type: String,
      required: true,
    },
    subjects: {
      type: [String],
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    offer_price: {
      type: Number,
      required: true,
    },
    instructors: [
      {
        name: {
          type: String,
          required: true,
        },
        bio: {
          type: String,
          required: false,
        },
        image: {
          type: String,
          required: false,
        },
      },
    ],
    type: {
      type: String,
      required: false,
      default: ""
    },
    studentsEnrolled: {
      type: Number,
      default: 0,
    },
    courseFor: {
      type: String,
      enum: [
        "class 9",
        "class 10",
        "class 11",
        "class 12",
        "admission",
        "job preparation",
        "hsc",
        "ssc",
      ],
      required: true,
    },
    classes: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Class",
      },
    ],
    materials: {
      type: [mongoose.Types.ObjectId],
      ref: "Material",
      required: false,
      default: []
    }
  },
  { timestamps: true }
);

export const Course =
  mongoose.models.Course || mongoose.model("Course", courseSchema);
