import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyAdminJwt = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.adminAccessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({
        succes: false,
        message: "Unauthorized request.",
      });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const admin = await Admin.findById(decodedToken?.id).select(
      "-password -refreshToken"
    );

    if (!admin) {
      return res.status(400).json({
        succes: false,
        message: "Unauthorized request. Admin not found",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(500).json({
      succes: false,
      message: "Invalid access token",
    });
  }
});
