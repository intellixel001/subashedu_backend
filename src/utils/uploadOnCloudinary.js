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
  const matches = url.match(/\/upload\/.*\/([^/]+)\.(jpg|png|jpeg|gif)/i);
  return matches ? matches[1] : null;
};

const uploadOnCloudinary = async (localFilePath, folderName) => {
  try {
    if (!localFilePath) return null;

    // Upload on cloudinary with folder structure
    const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
      folder: `suvash-edu/${folderName}`,
      resource_type: "auto",
    });

    // console.log("File uploaded successfully: ", uploadResponse.url);

    // Remove from temp when successful
    fs.unlinkSync(localFilePath);

    return uploadResponse;
  } catch (error) {
    console.log("Error uploading file: ", error);

    // Remove from temp when FAILED
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

const deleteFromCloudinary = async (imageUrl, folderName) => {
  try {
    const publicId = getPublicIdFromUrl(imageUrl);
    if (!publicId) {
      console.log("No valid public ID found in URL");
      return false;
    }

    const result = await cloudinary.uploader.destroy(
      `suvash-edu/${folderName}/${publicId}`
    );
    return result.result === "ok";
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return false;
  }
};

export { deleteFromCloudinary, uploadOnCloudinary };
