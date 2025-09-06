import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";

const studentSchema = new Schema(
  {
    // Personal Information
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    registrationNumber: {
      type: String,
      require: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },

    photoUrl: {
      type: String,
      // default:
      //   "https://res.cloudinary.com/dqj0xg3zv/image/upload/v1698231234/avatars/default-avatar.png",
      default: "",
    },

    // Educational Information
    educationLevel: {
      type: String,
      required: [true, "Education level is required"],
      enum: {
        values: [
          "class 9",
          "class 10",
          "class 11",
          "class 12",
          "admission",
          "job preparation",
          "hsc",
          "ssc",
        ],
        message: "Please select a valid education level",
      },
    },
    institution: {
      type: String,
      required: [true, "Institution name is required"],
      trim: true,
      maxlength: [200, "Institution name cannot exceed 200 characters"],
    },
    sscYear: {
      type: String,
      default: "na",
      required: false,
    },
    hscYear: {
      type: String,
      default: "na",
      required: false,
    },

    // Family Information
    fatherName: {
      type: String,
      // required: [true, "Father's name is required"],
      required: false,
      default: "",
      trim: true,
      maxlength: [100, "Father's name cannot exceed 100 characters"],
    },
    motherName: {
      type: String,
      // required: [true, "Mother's name is required"],
      required: false,
      default: "",
      trim: true,
      maxlength: [100, "Mother's name cannot exceed 100 characters"],
    },
    guardianPhone: {
      type: String,
      // required: [true, "Guardian's phone number is required"],
      required: false,
      default: "",
    },
    materials: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Material",
      required: false,
      default: [],
    },
    coursesEnrolled: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    // Account Security
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// Middleware to hash password before saving
studentSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to check if the password is correct
studentSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate an access token
studentSchema.methods.generateAccessToken = function () {
  const generatedToken = jwt.sign(
    {
      id: this._id,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
  return generatedToken;
};

// Method to generate a refresh token
studentSchema.methods.generateRefreshToken = function () {
  const generatedToken = jwt.sign(
    {
      id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
  return generatedToken;
};

export const Student =
  mongoose.models.Student || mongoose.model("Student", studentSchema);
