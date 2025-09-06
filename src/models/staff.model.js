import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";

const staffSchema = new Schema(
  {
    role: {
      type: String,
      default: "staff",
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
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
    role: {
      type: String,
      enum: ["staff", "teacher"],
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    photoUrl: {
      type: String,
      // default:
      //   "https://res.cloudinary.com/dqj0xg1zv/image/upload/v1698236482/suvash-edu/staffPhoto/default.png",
      default: "",
    },

    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// Middleware to hash password before saving
staffSchema.pre("save", async function (next) {
  this.updatedAt = Date.now();
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to check if the password is correct
staffSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate an access token
staffSchema.methods.generateAccessToken = function () {
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
staffSchema.methods.generateRefreshToken = function () {
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

staffSchema.methods.revokeRefreshToken = function () {
  this.refreshToken = null;
  return this.save();
};

export const Staff =
  mongoose.models.Staff || mongoose.model("Staff", staffSchema);
