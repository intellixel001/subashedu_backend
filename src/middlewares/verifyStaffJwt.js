import jwt from "jsonwebtoken";
import { Staff } from "../models/staff.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyStaffJwt = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.staffAccessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Unauthorized request",
      });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const staff = await Staff.findById(decodedToken?.id).select(
      "-password -refreshToken"
    );

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: "Unauthorized request. Staff not found",
      });
    }

    req.staff = staff;
    next();
  } catch (error) {
    console.log(error?.message);
    return res.status(500).json({
      success: false,
      message: "Invalid access token",
    });
  }
});
