import jwt from "jsonwebtoken";
import { Student } from "../models/student.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({
        succes: false,
        message: "Unauthorized request",
      });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const student = await Student.findById(decodedToken?.id)
      .select("-password -refreshToken")
      .populate("coursesEnrolled");

    if (!student) {
      return res.status(400).json({
        succes: false,
        message: "Unauthorized request. Student not found",
      });
    }

    req.student = student;
    next();
  } catch (error) {
    console.log(error?.message);
    return res.status(500).json({
      succes: false,
      message: "Invalid access token",
    });
  }
});
