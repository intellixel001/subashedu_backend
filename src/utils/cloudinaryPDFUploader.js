import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({
  path: "./.env",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  const matches = url.match(/\/upload\/.*\/([^/]+)\.pdf/i);
  return matches ? matches[1] : null;
};

const uploadPdfOnCloudinary = async (localFilePath, folderName) => {
  try {
    if (!localFilePath) return null;

    const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
      folder: `suvash-edu/${folderName}`,
      resource_type: "raw",
      access_mode: "authenticated", // Restrict direct access
      type: "private", // Private delivery type
    });

    fs.unlinkSync(localFilePath);
    return uploadResponse;
  } catch (error) {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

const deletePdfFromCloudinary = async (
  url,
  folderName,
  resourceType = "raw"
) => {
  try {
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) {
      return false;
    }

    const result = await cloudinary.uploader.destroy(
      `suvash-edu/${folderName}/${publicId}`,
      { resource_type: resourceType }
    );
    return result.result === "ok";
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return false;
  }
};

export { deletePdfFromCloudinary, uploadPdfOnCloudinary };
