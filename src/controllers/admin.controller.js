import axios from "axios";
import fs from "fs";
import { Material } from "../models/Material.model.js";
import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deletePdfFromCloudinary,
  uploadPdfOnCloudinary,
} from "../utils/cloudinaryPDFUploader.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/uploadOnCloudinary.js";
import { Admin } from "./../models/admin.model.js";
import { Blog } from "./../models/Blog.model.js";
import { Class } from "./../models/Class.model.js";
import { Course } from "./../models/course.model.js";
import { MaterialPayment } from "./../models/MaterialPayment.model.js";
import { Notice } from "./../models/notice.model.js";
import { Payment } from "./../models/payment.model.js";
import { Staff } from "./../models/staff.model.js";
import { Student } from "./../models/student.model.js";

const generateAccessAndRefreshToken = async (adminId) => {
  try {
    const admin = await Admin.findById(adminId);
    const accessToken = await admin.generateAccessToken();
    const refreshToken = await admin.generateRefreshToken();

    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error("Error generating access & refresh tokens");
  }
};

const createAdmin = asyncHandler(async (req, res, next) => {
  const { fullName, email, password, phone } = req.body;

  if (!fullName || !email || !password || !phone) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Admin already exists",
    });
  }

  let uploadAvatar = null;
  if (req.file) {
    try {
      uploadAvatar = await uploadOnCloudinary(req.file.path, "admin-avatars");
      if (!uploadAvatar?.url) {
        throw new Error("Failed to upload avatar");
      }
    } catch (error) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        success: false,
        message: "Error uploading avatar image",
      });
    } finally {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  }

  try {
    const admin = await Admin.create({
      fullName,
      email,
      password,
      phone,
      photoUrl: uploadAvatar?.url || null,
    });

    if (!admin) {
      if (uploadAvatar?.url) {
        await deleteFromCloudinary(uploadAvatar.url, "admin-avatars");
      }
      return res.status(400).json({
        success: false,
        message: "Admin not created",
      });
    }

    const copyAdmin = {
      id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      phone: admin.phone,
      photoUrl: admin.photoUrl,
    };

    return res.status(201).json({
      success: true,
      data: copyAdmin,
    });
  } catch (error) {
    if (uploadAvatar?.url) {
      await deleteFromCloudinary(uploadAvatar.url, "admin-avatars");
    }
    return res.status(500).json({
      success: false,
      message: "Error creating admin",
      error: error.message,
    });
  }
});

const loginAdmin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!(email && password)) {
    return res.status(400).json({
      success: false,
      message: "Enter valid credentials",
      data: null,
    });
  }

  const admin = await Admin.findOne({
    $or: [{ email: email }],
  }).select("+password");

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin not found",
      data: null,
    });
  }

  const isPasswordCorrect = await admin.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    return res.status(400).json({
      success: false,
      message: "Wrong password!",
      data: null,
    });
  }

  const loddgedInAdmin = await Admin.findById(admin._id).select(
    "-password -refreshToken"
  );

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    loddgedInAdmin._id
  );

  if (!(accessToken || refreshToken)) {
    throw new Error("Error generating tokens");
  }
  const options = {
    httpOnly: true,
    secure: process.env.SERVER_STATE === "production" ? true : false,
    path: "/",
  };

  return res
    .status(200)
    .cookie("adminAccessToken", accessToken, options)
    .cookie("adminRefreshToken", refreshToken, options)
    .json({
      success: true,
      message: "Login successful",
      data: loddgedInAdmin,
    });
});

const getAdmin = asyncHandler(async (req, res, next) => {
  const admin = req.admin;
  if (!admin) {
    return res.status(400).json({
      success: false,
      message: "Admin not found",
    });
  }
  return res.status(200).json({
    success: true,
    data: admin,
  });
});

// Staff functions
const getStaffs = asyncHandler(async (req, res, next) => {
  const staffs = await Staff.find({}).sort({ createdAt: -1 });
  return res.status(200).json({
    success: true,
    data: staffs,
    message: staffs.length === 0 ? "No staff found" : undefined,
  });
});

const updateStaff = asyncHandler(async (req, res, next) => {
  const { _id, fullName, email, phone, password, role } = req.body;

  if (!_id || !fullName || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  if (password && password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  if (!role === "staff" || !role === "teacher") {
    return res.status(500).json({
      success: false,
      message: "Invalid role provided.",
    });
  }

  const staff = await Staff.findById(_id);
  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    });
  }

  const oldPhotoUrl = staff.photoUrl;
  let uploadAvatar = null;

  if (req.file) {
    const avatarLocalPath = req.file.path;

    try {
      uploadAvatar = await uploadOnCloudinary(avatarLocalPath, "staff-photos");
      if (!uploadAvatar?.url) {
        throw new Error("Failed to upload new avatar");
      }

      if (oldPhotoUrl) {
        try {
          await deleteFromCloudinary(oldPhotoUrl, "staff-photos");
        } catch (error) {
          console.error("Error deleting old image:", error);
        }
      }
    } catch (error) {
      if (fs.existsSync(avatarLocalPath)) {
        fs.unlinkSync(avatarLocalPath);
      }
      return res.status(500).json({
        success: false,
        message: "Error uploading new profile image",
      });
    }
  }

  staff.fullName = fullName;
  staff.email = email;
  staff.phone = phone;
  staff.role = role;

  if (password && password.length >= 6) {
    staff.password = password;
  }
  if (uploadAvatar?.url) {
    staff.photoUrl = uploadAvatar.url;
  }

  try {
    await staff.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    if (uploadAvatar?.url) {
      try {
        await deleteFromCloudinary(uploadAvatar.url, "staff-photos");
      } catch (deleteError) {
        console.error("Error cleaning up new image:", deleteError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Error updating staff record",
      error: error.message,
    });
  }
});

const createStaff = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Profile image is required",
    });
  }

  const { fullName, email, password, phone, confirmPassword, role } = req.body;

  if (!fullName || !email || !password || !phone || !confirmPassword || !role) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  if (password !== confirmPassword) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: "Password and confirm password do not match",
    });
  }

  if (role !== "staff" && role !== "teacher") {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: "Invalid role provided. Role must be 'staff' or 'teacher'.",
    });
  }

  const existingStaff = await Staff.findOne({ email });
  if (existingStaff) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: "Staff already exists",
    });
  }

  const uploadAvatar = await uploadOnCloudinary(req.file.path, "staff-photos");
  if (!uploadAvatar) {
    return res.status(500).json({
      success: false,
      message: "Error uploading profile image",
    });
  }

  const staff = await Staff.create({
    fullName,
    email,
    password,
    phone,
    photoUrl: uploadAvatar.url,
    role,
  });

  if (!staff) {
    return res.status(500).json({
      success: false,
      message: "Staff creation failed",
    });
  }

  return res.status(201).json({
    success: true,
    data: staff,
  });
});

const deleteStaff = asyncHandler(async (req, res, next) => {
  const { _id } = req.body;
  if (!_id) {
    return res.status(400).json({
      success: false,
      message: "Please provide staff id",
    });
  }

  const staff = await Staff.findById(_id);
  if (!staff) {
    return res.status(404).json({
      success: false,
      message: "Staff not found",
    });
  }

  if (staff.photoUrl) {
    try {
      const deletionResult = await deleteFromCloudinary(
        staff.photoUrl,
        "staff-photos"
      );
      if (!deletionResult) {
        console.warn("Failed to delete image from Cloudinary");
      }
    } catch (error) {
      console.error("Error deleting image from Cloudinary:", error);
    }
  }

  const deletedStaff = await Staff.findByIdAndDelete(_id);
  if (!deletedStaff) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete staff record",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Staff deleted successfully",
  });
});

// Student functions
const getStudents = asyncHandler(async (req, res, next) => {
  const students = await Student.find({});

  return res.status(200).json({
    success: true,
    data: students,
    message: students.length === 0 ? "No students found" : undefined,
  });
});

const updateStudent = asyncHandler(async (req, res, next) => {
  // Extract fields from FormData
  const {
    _id,
    fullName,
    email,
    phone,
    password,
    educationLevel,
    institution,
    sscYear,
    hscYear,
    fatherName,
    motherName,
    guardianPhone,
    registrationNumber,
  } = req.body;

  // Validate required fields, excluding registrationNumber as it can be fetched from existing student
  if (
    !_id ||
    !fullName ||
    !email ||
    !phone ||
    !educationLevel ||
    !institution ||
    !fatherName ||
    !motherName ||
    !guardianPhone
  ) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  // Validate password length if provided
  if (password && password.length < 6) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  // Find the student
  const student = await Student.findById(_id);
  if (!student) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  // Handle avatar upload
  const oldPhotoUrl = student.photoUrl;
  let uploadAvatar = null;

  if (req.file) {
    const avatarLocalPath = req.file.path;
    try {
      uploadAvatar = await uploadOnCloudinary(
        avatarLocalPath,
        "student-photos"
      );
      if (!uploadAvatar?.url) {
        throw new Error("Failed to upload new avatar");
      }

      if (oldPhotoUrl) {
        try {
          await deleteFromCloudinary(oldPhotoUrl, "student-photos");
        } catch (error) {
          console.error("Error deleting old image:", error);
        }
      }
    } catch (error) {
      if (fs.existsSync(avatarLocalPath)) {
        fs.unlinkSync(avatarLocalPath);
      }
      return res.status(500).json({
        success: false,
        message: "Error uploading new profile image",
      });
    }
  }

  // Update student fields
  student.fullName = fullName;
  student.email = email;
  student.phone = phone;
  student.educationLevel = educationLevel;
  student.institution = institution;
  student.sscYear = sscYear || "na";
  student.hscYear = hscYear || "na";
  student.fatherName = fatherName;
  student.motherName = motherName;
  student.guardianPhone = guardianPhone;
  student.registrationNumber = registrationNumber || student.registrationNumber; // Use existing registrationNumber if not provided

  if (password && password.length >= 6) {
    student.password = password;
  }
  if (uploadAvatar?.url) {
    student.photoUrl = uploadAvatar.url;
  }

  try {
    await student.save({ validateBeforeSave: false });

    // Prepare response data
    const studentData = {
      _id: student._id,
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      registrationNumber: student.registrationNumber,
      educationLevel: student.educationLevel,
      institution: student.institution,
      photoUrl: student.photoUrl,
      sscYear: student.sscYear,
      hscYear: student.hscYear,
      fatherName: student.fatherName,
      motherName: student.motherName,
      guardianPhone: student.guardianPhone,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: studentData,
    });
  } catch (error) {
    if (uploadAvatar?.url) {
      try {
        await deleteFromCloudinary(uploadAvatar.url, "student-photos");
      } catch (deleteError) {
        console.error("Error cleaning up new image:", deleteError);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Error updating student record",
      error: error.message,
    });
  }
});

const createStudent = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Profile image is required",
    });
  }

  const {
    fullName,
    email,
    password,
    confirmPassword,
    phone,
    educationLevel,
    institution,
    sscYear,
    hscYear,
    fatherName,
    motherName,
    guardianPhone,
  } = req.body;

  if (
    !fullName ||
    !email ||
    !password ||
    !confirmPassword ||
    !phone ||
    !educationLevel ||
    !institution ||
    !fatherName ||
    !motherName ||
    !guardianPhone
  ) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  if (phone.length < 10) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Phone number must be at least 10 digits long",
    });
  }

  if (phone === guardianPhone) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Phone number cannot be the same as guardian's phone number",
    });
  }

  if (password !== confirmPassword) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Password and confirm password do not match",
    });
  }

  if (password.length < 6) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  const existingStudent = await Student.findOne({
    $or: [{ email }],
  });
  if (existingStudent) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({
      success: false,
      message: "Student with this email already exists.",
    });
  }

  const lastDocument = await Student.findOne().sort({ _id: -1 });

  let newRegistrationNumber;
  if (lastDocument) {
    newRegistrationNumber = parseInt(lastDocument.registrationNumber) + 1;
  } else {
    newRegistrationNumber =
      parseInt(process.env.CURRENT_STUDENT_NUMBER || "1000") + 1;
  }

  const uploadAvatar = await uploadOnCloudinary(
    req.file.path,
    "student-photos"
  );
  if (!uploadAvatar) {
    return res.status(500).json({
      success: false,
      message: "Error uploading profile image",
    });
  }

  const student = await Student.create({
    fullName,
    email,
    password,
    phone,
    registrationNumber: newRegistrationNumber.toString(),
    educationLevel,
    institution,
    sscYear: sscYear || "na",
    hscYear: hscYear || "na",
    fatherName,
    motherName,
    guardianPhone,
    photoUrl: uploadAvatar.url,
  });

  if (!student) {
    if (uploadAvatar?.url) {
      try {
        await deleteFromCloudinary(uploadAvatar.url, "student-photos");
      } catch (error) {
        console.error("Error cleaning up uploaded image:", error);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Student creation failed",
    });
  }

  const studentData = {
    _id: student._id,
    fullName: student.fullName,
    email: student.email,
    phone: student.phone,
    registrationNumber: student.registrationNumber,
    educationLevel: student.educationLevel,
    institution: student.institution,
    photoUrl: student.photoUrl,
    createdAt: student.createdAt,
  };

  return res.status(201).json({
    success: true,
    data: studentData,
  });
});

const deleteStudent = asyncHandler(async (req, res, next) => {
  const { _id } = req.body;
  if (!_id) {
    return res.status(400).json({
      success: false,
      message: "Please provide student id",
    });
  }

  const student = await Student.findById(_id);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  if (student.photoUrl) {
    try {
      const deletionResult = await deleteFromCloudinary(
        student.photoUrl,
        "student-photos"
      );
      if (!deletionResult) {
        console.warn("Failed to delete student image from Cloudinary");
      }
    } catch (error) {
      console.error("Error deleting student image from Cloudinary:", error);
    }
  }

  const deletedStudent = await Student.findByIdAndDelete(_id);
  if (!deletedStudent) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete student record",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Student deleted successfully",
    data: {
      _id: deletedStudent._id,
      fullName: deletedStudent.fullName,
      email: deletedStudent.email,
    },
  });
});

// Course functions
const getCourses = asyncHandler(async (req, res, next) => {
  const courses = await Course.find({});

  const subjectSet = new Set();

  courses.forEach((course) => {
    if (Array.isArray(course.subjects)) {
      course.subjects.forEach((subject) => subjectSet.add(subject));
    }
  });

  const subjects = Array.from(subjectSet);

  return res.status(200).json({
    success: true,
    data: courses, // Return courses array directly
    subjects, // Include subjects separately
    message:
      courses?.length === 0
        ? "No courses available"
        : subjects?.length === 0
        ? "No Subjects available"
        : undefined,
  });
});

// Course functions
const getSingleCourse = asyncHandler(async (req, res, next) => {
  try {
    const course = await Course.findById(req.params?.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    // Invalid ObjectId or DB error
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
});

const createCourse = asyncHandler(async (req, res, next) => {
  if (!req.files || !req.files.thumbnail) {
    return res.status(400).json({
      success: false,
      message: "Thumbnail image is required",
    });
  }

  const {
    title,
    description,
    short_description,
    subjects,
    tags,
    price,
    offer_price,
    instructors,
    courseFor,
  } = req.body;

  if (
    !title ||
    !description ||
    !short_description ||
    !subjects ||
    !tags ||
    !price ||
    !offer_price ||
    !instructors ||
    !courseFor
  ) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  let parsedSubjects;
  let parsedTags;
  let parsedInstructors;
  try {
    parsedSubjects = JSON.parse(subjects);
    parsedTags = JSON.parse(tags);
    parsedInstructors = JSON.parse(instructors);
  } catch (error) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Invalid format for subjects, tags, or instructors",
    });
  }

  if (!Array.isArray(parsedSubjects) || parsedSubjects.length === 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Subjects must be a non-empty array",
    });
  }

  if (!Array.isArray(parsedTags) || parsedTags.length === 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Tags must be a non-empty array",
    });
  }

  if (!Array.isArray(parsedInstructors) || parsedInstructors.length === 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Instructors must be a non-empty array",
    });
  }

  for (const instructor of parsedInstructors) {
    if (!instructor.name) {
      if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
        fs.unlinkSync(req.files.thumbnail[0].path);
      }
      return res.status(400).json({
        success: false,
        message: "Each instructor must have a name",
      });
    }
  }

  const parsedPrice = parseFloat(price);
  const parsedOfferPrice = parseFloat(offer_price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Price must be a valid non-negative number",
    });
  }
  if (isNaN(parsedOfferPrice) || parsedOfferPrice < 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Offer price must be a valid non-negative number",
    });
  }

  const validCourseFor = [
    "class 9",
    "class 10",
    "class 11",
    "class 12",
    "hsc",
    "ssc",
    "admission",
    "job preparation",
  ];
  if (!validCourseFor.includes(courseFor)) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Invalid courseFor value",
    });
  }

  const uploadThumbnail = await uploadOnCloudinary(
    req.files.thumbnail[0].path,
    "course-thumbnails"
  );
  if (!uploadThumbnail?.url) {
    return res.status(500).json({
      success: false,
      message: "Error uploading thumbnail image",
    });
  }

  // Handle instructor images
  const instructorImages = req.files.instructorImages || [];
  const uploadedInstructorImages = [];
  try {
    for (const image of instructorImages) {
      const uploadResult = await uploadOnCloudinary(
        image.path,
        "instructor-images"
      );
      if (!uploadResult?.url) {
        throw new Error("Failed to upload instructor image");
      }
      uploadedInstructorImages.push(uploadResult.url);
    }

    // Assign uploaded image URLs to instructors
    parsedInstructors = parsedInstructors.map((instructor, index) => ({
      ...instructor,
      image: uploadedInstructorImages[index] || instructor.image || null,
    }));
  } catch (error) {
    // Clean up thumbnail if instructor image upload fails
    try {
      await deleteFromCloudinary(uploadThumbnail.url, "course-thumbnails");
    } catch (deleteError) {
      console.error("Error cleaning up thumbnail:", deleteError);
    }
    // Clean up any successfully uploaded instructor images
    for (const url of uploadedInstructorImages) {
      try {
        await deleteFromCloudinary(url, "instructor-images");
      } catch (deleteError) {
        console.error("Error cleaning up instructor image:", deleteError);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Error uploading instructor images",
    });
  } finally {
    // Clean up local files
    if (req.files.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    for (const image of instructorImages) {
      if (fs.existsSync(image.path)) {
        fs.unlinkSync(image.path);
      }
    }
  }

  const newDoc = (await Course.findOne().sort({ _id: -1 })) || null;
  const newId = Number(newDoc?.id) + 1 || 1;

  const course = await Course.create({
    id: newId.toString(),
    title,
    description,
    short_description,
    subjects: parsedSubjects,
    thumbnailUrl: uploadThumbnail.url,
    tags: parsedTags,
    price: parsedPrice,
    offer_price: parsedOfferPrice,
    instructors: parsedInstructors,
    courseFor,
  });

  if (!course) {
    try {
      await deleteFromCloudinary(uploadThumbnail.url, "course-thumbnails");
      for (const url of uploadedInstructorImages) {
        await deleteFromCloudinary(url, "instructor-images");
      }
    } catch (deleteError) {
      console.error("Error cleaning up images:", deleteError);
    }
    return res.status(500).json({
      success: false,
      message: "Course creation failed",
    });
  }

  return res.status(201).json({
    success: true,
    data: course,
  });
});

const updateCourse = asyncHandler(async (req, res, next) => {
  const {
    _id,
    title,
    description,
    short_description,
    subjects,
    tags,
    price,
    offer_price,
    instructors,
    courseFor,
  } = req.body;

  if (
    !_id ||
    !title ||
    !description ||
    !short_description ||
    !subjects ||
    !tags ||
    !price ||
    !offer_price ||
    !instructors ||
    !courseFor
  ) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  let parsedSubjects;
  let parsedTags;
  let parsedInstructors;
  try {
    parsedSubjects = JSON.parse(subjects);
    parsedTags = JSON.parse(tags);
    parsedInstructors = JSON.parse(instructors);
  } catch (error) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Invalid format for subjects, tags, or instructors",
    });
  }

  if (!Array.isArray(parsedSubjects) || parsedSubjects.length === 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Subjects must be a non-empty array",
    });
  }

  if (!Array.isArray(parsedTags) || parsedTags.length === 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Tags must be a non-empty array",
    });
  }

  if (!Array.isArray(parsedInstructors) || parsedInstructors.length === 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Instructors must be a non-empty array",
    });
  }

  for (const instructor of parsedInstructors) {
    if (!instructor.name) {
      if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
        fs.unlinkSync(req.files.thumbnail[0].path);
      }
      return res.status(400).json({
        success: false,
        message: "Each instructor must have a name",
      });
    }
  }

  const parsedPrice = parseFloat(price);
  const parsedOfferPrice = parseFloat(offer_price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Price must be a valid non-negative number",
    });
  }
  if (isNaN(parsedOfferPrice) || parsedOfferPrice < 0) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Offer price must be a valid non-negative number",
    });
  }

  const validCourseFor = [
    "class 9",
    "class 10",
    "class 11",
    "class 12",
    "hsc",
    "ssc",
    "admission",
    "job preparation",
  ];
  if (!validCourseFor.includes(courseFor)) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(400).json({
      success: false,
      message: "Invalid courseFor value",
    });
  }

  const course = await Course.findById(_id);
  if (!course) {
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    return res.status(404).json({
      success: false,
      message: "Course not found",
    });
  }

  let thumbnailUrl = course.thumbnailUrl;
  if (req.files?.thumbnail) {
    const thumbnailLocalPath = req.files.thumbnail[0].path;
    try {
      const uploadThumbnail = await uploadOnCloudinary(
        thumbnailLocalPath,
        "course-thumbnails"
      );
      if (!uploadThumbnail?.url) {
        throw new Error("Failed to upload new thumbnail");
      }
      thumbnailUrl = uploadThumbnail.url;

      if (course.thumbnailUrl) {
        try {
          await deleteFromCloudinary(course.thumbnailUrl, "course-thumbnails");
        } catch (error) {
          console.error("Error deleting old thumbnail:", error);
        }
      }
    } catch (error) {
      if (fs.existsSync(thumbnailLocalPath)) {
        fs.unlinkSync(thumbnailLocalPath);
      }
      return res.status(500).json({
        success: false,
        message: "Error uploading new thumbnail image",
      });
    }
  }

  // Handle instructor images
  const instructorImages = req.files.instructorImages || [];
  const uploadedInstructorImages = [];
  const oldInstructorImages = course.instructors
    .map((instructor) => instructor.image)
    .filter((image) => image); // Keep only non-null images

  try {
    // Upload new instructor images
    for (const image of instructorImages) {
      const uploadResult = await uploadOnCloudinary(
        image.path,
        "instructor-images"
      );
      if (!uploadResult?.url) {
        throw new Error("Failed to upload instructor image");
      }
      uploadedInstructorImages.push(uploadResult.url);
    }

    // Map instructors, preserving existing images unless a new image is uploaded
    let imageIndex = 0;
    parsedInstructors = parsedInstructors.map((instructor) => {
      // If the frontend indicates a new image was uploaded for this instructor
      if (
        instructor.image === null &&
        imageIndex < uploadedInstructorImages.length
      ) {
        const newImage = uploadedInstructorImages[imageIndex];
        imageIndex++;
        return { ...instructor, image: newImage };
      }
      // Otherwise, retain the existing image or set to null if none
      return { ...instructor, image: instructor.image || null };
    });

    // Delete old instructor images that are no longer used
    const newInstructorImages = parsedInstructors
      .map((instructor) => instructor.image)
      .filter((image) => image);
    for (const oldImage of oldInstructorImages) {
      if (!newInstructorImages.includes(oldImage)) {
        try {
          await deleteFromCloudinary(oldImage, "instructor-images");
        } catch (error) {
          console.error("Error deleting old instructor image:", error);
        }
      }
    }
  } catch (error) {
    // Clean up new thumbnail if instructor image upload fails
    if (thumbnailUrl !== course.thumbnailUrl) {
      try {
        await deleteFromCloudinary(thumbnailUrl, "course-thumbnails");
      } catch (deleteError) {
        console.error("Error cleaning up new thumbnail:", deleteError);
      }
    }
    // Clean up any successfully uploaded instructor images
    for (const url of uploadedInstructorImages) {
      try {
        await deleteFromCloudinary(url, "instructor-images");
      } catch (deleteError) {
        console.error("Error cleaning up instructor image:", deleteError);
      }
    }
    for (const image of instructorImages) {
      if (fs.existsSync(image.path)) {
        fs.unlinkSync(image.path);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Error uploading instructor images",
    });
  } finally {
    // Clean up local files
    if (req.files?.thumbnail && fs.existsSync(req.files.thumbnail[0].path)) {
      fs.unlinkSync(req.files.thumbnail[0].path);
    }
    for (const image of instructorImages) {
      if (fs.existsSync(image.path)) {
        fs.unlinkSync(image.path);
      }
    }
  }

  course.title = title;
  course.description = description;
  course.short_description = short_description;
  course.subjects = parsedSubjects;
  course.thumbnailUrl = thumbnailUrl;
  course.tags = parsedTags;
  course.price = parsedPrice;
  course.offer_price = parsedOfferPrice;
  course.instructors = parsedInstructors;
  course.courseFor = courseFor;

  try {
    await course.save({ validateBeforeSave: false });
    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    // Clean up new images if save fails
    if (thumbnailUrl !== course.thumbnailUrl) {
      try {
        await deleteFromCloudinary(thumbnailUrl, "course-thumbnails");
      } catch (deleteError) {
        console.error("Error cleaning up new thumbnail:", deleteError);
      }
    }
    for (const url of uploadedInstructorImages) {
      try {
        await deleteFromCloudinary(url, "instructor-images");
      } catch (deleteError) {
        console.error("Error cleaning up new instructor image:", deleteError);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Error updating course",
      error: error.message,
    });
  }
});

const deleteCourse = asyncHandler(async (req, res, next) => {
  const { _id } = req.body;
  if (!_id) {
    return res.status(400).json({
      success: false,
      message: "Please provide course id",
    });
  }

  const course = await Course.findById(_id);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found",
    });
  }

  if (course.thumbnailUrl) {
    try {
      await deleteFromCloudinary(course.thumbnailUrl, "course-thumbnails");
    } catch (error) {
      console.error("Error deleting thumbnail from Cloudinary:", error);
    }
  }

  // Delete instructor images
  for (const instructor of course.instructors) {
    if (instructor.image) {
      try {
        await deleteFromCloudinary(instructor.image, "instructor-images");
      } catch (error) {
        console.error(
          "Error deleting instructor image from Cloudinary:",
          error
        );
      }
    }
  }

  const deletedCourse = await Course.findByIdAndDelete(_id);
  if (!deletedCourse) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete course",
    });
  }

  //delete classes related to the course
  const deletedClasses = await Class.deleteMany({ course: _id });
  if (!deletedClasses) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete course",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Course deleted successfully",
  });
});

const sendNotification = asyncHandler(async (req, res, next) => {
  const { message, sentTo } = req.body;
  if (!message || !sentTo) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  // Validate sentTo exists and determine its model
  let sentToModel = null;
  const admin = await Admin.findById(sentTo);
  if (admin) {
    sentToModel = "Admin";
  } else {
    const staff = await Staff.findById(sentTo);
    if (staff) {
      sentToModel = "Staff";
    } else {
      const student = await Student.findById(sentTo);
      if (student) {
        sentToModel = "Student";
      }
    }
  }

  if (!sentToModel) {
    return res.status(404).json({
      success: false,
      message: "Recipient not found",
    });
  }

  const notification = await Notification.create({
    sentBy: req.admin?._id,
    sentByModel: "Admin",
    sentTo,
    sentToModel,
    message,
    readReceipt: false,
    deletedBySender: false,
    deletedByRecipient: false,
  });

  if (!notification) {
    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
    });
  }

  return res.status(201).json({
    success: true,
    data: notification,
  });
});

const getNotification = asyncHandler(async (req, res, next) => {
  const adminId = req.admin?._id;

  const notifications = await Notification.find({
    $or: [
      { sentTo: adminId, deletedByRecipient: false },
      { sentBy: adminId, deletedBySender: false },
    ],
  }).sort({ createdAt: -1 });

  // Dynamically populate sentBy based on sentByModel
  const populatedNotifications = await Promise.all(
    notifications.map(async (notification) => {
      try {
        let populatedNotification = notification;
        if (notification.sentByModel === "Admin") {
          populatedNotification = await Notification.populate(notification, {
            path: "sentBy",
            model: Admin,
            select: "_id fullName email photoUrl",
          });
        } else if (notification.sentByModel === "Staff") {
          populatedNotification = await Notification.populate(notification, {
            path: "sentBy",
            model: Staff,
            select: "_id fullName email photoUrl",
          });
        } else if (notification.sentByModel === "Student") {
          populatedNotification = await Notification.populate(notification, {
            path: "sentBy",
            model: Student,
            select: "_id fullName email photoUrl",
          });
        }
        return populatedNotification;
      } catch (error) {
        console.error(
          `Error populating notification ${notification._id}:`,
          error
        );
        return notification;
      }
    })
  );

  return res.status(200).json({
    success: true,
    data: populatedNotifications,
    message:
      populatedNotifications.length === 0
        ? "No notifications found"
        : undefined,
  });
});

const updateNotificationReadStatus = asyncHandler(async (req, res, next) => {
  const { notificationIds } = req.body;

  if (
    !notificationIds ||
    !Array.isArray(notificationIds) ||
    notificationIds.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide an array of notification IDs",
    });
  }

  try {
    const updatedNotifications = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        sentTo: req.admin?._id,
        deletedByRecipient: false,
      },
      { $set: { readReceipt: true } }
    );

    if (updatedNotifications.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No notifications found or already marked as read",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      data: { modifiedCount: updatedNotifications.modifiedCount },
    });
  } catch (error) {
    console.error("Error updating notification read status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification read status",
    });
  }
});

const deleteNotification = asyncHandler(async (req, res, next) => {
  const { notificationId } = req.body;
  const adminId = req.admin?._id;

  if (!notificationId) {
    return res.status(400).json({
      success: false,
      message: "Please provide a notification ID",
    });
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  // Check if the admin is either the sender or recipient
  const isSender = notification.sentBy.toString() === adminId.toString();
  const isRecipient = notification.sentTo.toString() === adminId.toString();

  if (!isSender && !isRecipient) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized to delete this notification",
    });
  }

  // Update the appropriate deletion flag
  if (isSender) {
    notification.deletedBySender = true;
  }
  if (isRecipient) {
    notification.deletedByRecipient = true;
  }

  // If both sender and recipient have deleted, remove the notification
  if (notification.deletedBySender && notification.deletedByRecipient) {
    await Notification.findByIdAndDelete(notificationId);
  } else {
    await notification.save();
  }

  return res.status(200).json({
    success: true,
    message: "Notification deleted successfully",
  });
});

const clearNotifications = asyncHandler(async (req, res, next) => {
  const adminId = req.admin?._id;

  // Update notifications where admin is the sender
  const senderUpdateResult = await Notification.updateMany(
    {
      sentBy: adminId,
      deletedBySender: false,
    },
    {
      $set: { deletedBySender: true },
    }
  );

  // Update notifications where admin is the recipient
  const recipientUpdateResult = await Notification.updateMany(
    {
      sentTo: adminId,
      deletedByRecipient: false,
    },
    {
      $set: { deletedByRecipient: true },
    }
  );

  // Delete notifications where both sender and recipient have deleted
  const deleteResult = await Notification.deleteMany({
    deletedBySender: true,
    deletedByRecipient: true,
  });

  const modifiedCount =
    senderUpdateResult.modifiedCount + recipientUpdateResult.modifiedCount;

  if (modifiedCount === 0) {
    return res.status(404).json({
      success: false,
      message: "No notifications found to clear",
    });
  }

  return res.status(200).json({
    success: true,
    message: "All notifications cleared successfully",
    data: { modifiedCount, deletedCount: deleteResult.deletedCount },
  });
});

const getRoundedChartData = asyncHandler(async (req, res, next) => {
  const studentCount = (await Student.countDocuments({})) || 0;
  const staffCount = (await Staff.countDocuments({ role: "staff" })) || 0;
  const teacherCount = (await Staff.countDocuments({ role: "teacher" })) || 0;
  const courseCount = (await Course.countDocuments({})) || 0;
  const classCount = (await Class.countDocuments({})) || 0;

  const data = {
    studentCount,
    staffCount,
    classCount,
    teacherCount,
    courseCount,
  };

  return res.status(200).json({
    success: true,
    message: "Successfully fetched rounded chart data.",
    data,
  });
});

const getClasses = asyncHandler(async (req, res, next) => {
  const classes = await Class.find({
    subject: { $exists: true, $ne: null },
  }).populate("course", "title courseFor");
  if (classes.length === 0) {
    return res.status(200).json({
      success: true,
      data: [],
      message: "No classes available",
    });
  }

  // Log any classes with invalid subjects for debugging
  const invalidClasses = await Class.find({
    $or: [{ subject: null }, { subject: { $exists: false } }],
  });
  if (invalidClasses.length > 0) {
    console.warn("Found classes with missing subjects:", invalidClasses);
  }

  return res.status(200).json({
    success: true,
    data: classes,
  });
});

const deleteClass = asyncHandler(async (req, res, next) => {
  const { _id } = req.body;
  if (!_id) {
    return res.status(400).json({
      success: false,
      message: "Please provide class ID",
    });
  }

  const cls = await Class.findById(_id);
  if (!cls) {
    return res.status(404).json({
      success: false,
      message: "Class not found",
    });
  }

  // Delete video from Cloudinary if exists
  if (cls.videoLink && !cls.isActiveLive) {
    try {
      const deletionResult = await deleteFromCloudinary(
        cls.videoLink,
        "class-videos"
      );
      if (!deletionResult) {
        console.warn(`Failed to delete video from Cloudinary for class ${_id}`);
      }
    } catch (error) {
      console.error(
        `Error deleting video from Cloudinary for class ${_id}:`,
        error
      );
    }
  }

  // Remove class from course
  const course = await Course.findById(cls.course);
  if (course) {
    const initialLength = course.classes.length;
    course.classes = course.classes.filter(
      (classId) => classId.toString() !== _id
    );
    if (course.classes.length < initialLength) {
      await course.save({ validateBeforeSave: false });
    } else {
      console.warn(
        `Class ${_id} was not found in course ${course._id} classes array`
      );
    }
  } else {
    console.warn(`Course not found for class ${_id}`);
  }

  const deletedClass = await Class.findByIdAndDelete(_id);
  if (!deletedClass) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete class",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Class deleted successfully",
  });
});

const stopLiveClass = asyncHandler(async (req, res, next) => {
  const { _id } = req.body;
  if (!_id) {
    return res.status(400).json({
      success: false,
      message: "Please provide class ID",
    });
  }

  const cls = await Class.findById(_id);
  if (!cls) {
    return res.status(404).json({
      success: false,
      message: "Class not found",
    });
  }

  if (!cls.isActiveLive) {
    return res.status(400).json({
      success: false,
      message: "Class is not currently live",
    });
  }

  cls.isActiveLive = false;
  await cls.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Live class stopped successfully",
    data: cls,
  });
});

//payments
// Get pending payments
const getPendingPayments = asyncHandler(async (req, res, next) => {
  try {
    // Find all pending enrollments
    const enrollments = await EnrollCourse.find({ status: "pending" });

    const data = await Promise.all(
      enrollments.map(async (enroll) => {
        // Get student info
        const student = await Student.findById(enroll.userid);
        // Get course info (use first course in enrollcourse array)
        const courseId = enroll.id;
        const course = await Course.findById(courseId);

        return {
          _id: enroll._id,
          studentId: student?._id,
          courseId: course?._id,
          student: {
            fullName: student?.fullName || "",
            email: student?.email || "",
            registrationNumber: student?.registrationNumber || "",
          },
          course: {
            title: course?.title || "",
            price: course?.price || 0,
            thumbnailUrl: course?.thumbnailUrl || "",
            courseFor: course?.courseFor || "",
            offer_price: course?.offer_price || 0,
          },
          paymentMethod: enroll.paymentMethod || "",
          transactionId: enroll.tranjectionid || "",
          status: enroll.status,
          createdAt: enroll.createdAt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data,
      message: data.length === 0 ? "No pending payments found" : undefined,
    });
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching pending payments",
    });
  }
});

// Verify payment

const verifyPayment = asyncHandler(async (req, res, next) => {
  const { paymentId, studentId, courseId } = req.body;

  if (!paymentId || !studentId || !courseId) {
    return res.status(400).json({
      success: false,
      message: "Payment ID, student ID, and course ID are required",
    });
  }

  // Update payment status to approved if it is pending
  const paymentUpdate = await EnrollCourse.updateOne(
    { _id: paymentId, status: "pending" },
    { $set: { status: "approved" } }
  );

  if (paymentUpdate.modifiedCount === 0) {
    return res.status(400).json({
      success: false,
      message: "Payment not found or already approved",
    });
  }

  // Increment studentsEnrolled in course
  await Course.updateOne({ _id: courseId }, { $inc: { studentsEnrolled: 1 } });

  // Add courseId to student's coursesEnrolled array if not already present
  await Student.updateOne(
    { _id: studentId },
    { $addToSet: { coursesEnrolled: courseId } }
  );

  return res.status(200).json({
    success: true,
    message: "Payment verified and enrollment updated successfully",
    data: {
      paymentId,
      studentId,
      courseId,
      status: "approved",
    },
  });
});

// Delete payment
const deletePayment = asyncHandler(async (req, res, next) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({
      success: false,
      message: "Payment ID is required",
    });
  }

  const payment = await EnrollCourse.findById(paymentId);
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "Payment not found",
    });
  }

  const deletedPayment = await EnrollCourse.findByIdAndDelete(paymentId);
  if (!deletedPayment) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete payment",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Payment deleted successfully",
    data: {
      paymentId: deletedPayment._id,
    },
  });
});

const createNotice = asyncHandler(async (req, res, next) => {
  const { content } = req.body;

  // Validate content
  if (!content || content.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Please provide valid content for the notice",
    });
  }

  try {
    // Check for existing notices
    const currentNotices = await Notice.find({});

    // Delete existing notices if any
    if (currentNotices.length > 0) {
      await Notice.deleteMany({});
    }

    // Create new notice
    const notice = await Notice.create({
      content: content.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Notice created successfully",
      data: notice,
    });
  } catch (error) {
    console.error("Error creating notice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create notice",
      error: error.message,
    });
  }
});

const getNotice = asyncHandler(async (req, res, next) => {
  try {
    // Check for existing notices
    const currentNotices = await Notice.find({});

    return res.status(201).json({
      success: true,
      message: "Notice showing successfully",
      data: currentNotices,
    });
  } catch (error) {
    console.error("Error creating notice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create notice",
      error: error.message,
    });
  }
});

const deleteNotice = asyncHandler(async (req, res, next) => {
  const clear = await Notice.deleteMany({});

  if (!clear || clear.deletedCount === 0) {
    return res.status(501).json({
      success: false,
      message: "Could not find any notice to clear",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Notice deleted successfully",
  });
});

const getInvoices = asyncHandler(async (req, res, next) => {
  const invoices = await Payment.find({})
    .populate("studentId", "fullName email registrationNumber")
    .populate("courseId", "title price thumbnailUrl courseFor")
    .sort({ createdAt: -1 });

  if (!invoices || invoices.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "No invoices found" });
  }

  // Map invoices to ensure consistent data structure
  const formattedInvoices = invoices.map((payment) => ({
    _id: payment._id,
    studentId: payment.studentId
      ? {
          _id: payment.studentId._id,
          fullName: payment.studentId.fullName || "Unknown Student",
          email: payment.studentId.email || "N/A",
          registrationNumber: payment.studentId.registrationNumber || "N/A",
        }
      : {
          _id: "N/A",
          fullName: "Unknown Student",
          email: "N/A",
          registrationNumber: "N/A",
        },
    courseId: payment.courseId
      ? {
          _id: payment.courseId._id,
          title: payment.courseId.title || "Unknown Course",
          price: payment.courseId.price || 0,
          thumbnailUrl: payment.courseId.thumbnailUrl || null,
          courseFor: payment.courseId.courseFor || "N/A",
        }
      : {
          _id: "N/A",
          title: "Unknown Course",
          price: 0,
          thumbnailUrl: null,
          courseFor: "N/A",
        },
    paymentMethod: payment.paymentMethod || "N/A",
    mobileNumber: payment.mobileNumber || "N/A",
    transactionId: payment.transactionId || "N/A",
    amount: payment.amount || 0,
    status: payment.status || "unknown",
    createdAt: payment.createdAt || new Date().toISOString(),
  }));

  res.status(200).json({
    success: true,
    message: "Invoices found",
    data: formattedInvoices,
  });
});

const createBlog = asyncHandler(async (req, res) => {
  const { title, shortDescription, description, author } = req.body;

  // Parse author if it's a JSON string
  let parsedAuthor;
  try {
    parsedAuthor = typeof author === "string" ? JSON.parse(author) : author;
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid author format",
    });
  }

  if (!title || !shortDescription || !description || !parsedAuthor?.name) {
    return res.status(400).json({
      success: false,
      message:
        "Title, short description, description, and author name are required",
    });
  }

  let authorPhotoUrl = "";
  let thumbnailUrl = "";

  if (req.files) {
    const { authorPhoto, thumbnail } = req.files;

    if (authorPhoto) {
      const uploadResult = await uploadOnCloudinary(
        authorPhoto[0].path,
        "author-photos"
      );
      if (!uploadResult?.url) {
        return res.status(500).json({
          success: false,
          message: "Error uploading author photo",
        });
      }
      authorPhotoUrl = uploadResult.url;
    }

    if (thumbnail) {
      const uploadResult = await uploadOnCloudinary(
        thumbnail[0].path,
        "blog-thumbnails"
      );
      if (!uploadResult?.url) {
        return res.status(500).json({
          success: false,
          message: "Error uploading blog thumbnail",
        });
      }
      thumbnailUrl = uploadResult.url;
    }
  }

  const blog = await Blog.create({
    title: title.trim(),
    shortDescription: shortDescription.trim(),
    description: description.trim(),
    thumbnail: thumbnailUrl,
    author: {
      name: parsedAuthor.name.trim(),
      photoUrl: authorPhotoUrl,
    },
  });

  if (!blog) {
    return res.status(500).json({
      success: false,
      message: "Error creating blog post",
    });
  }

  return res.status(201).json({
    success: true,
    message: "Blog post created successfully",
    data: blog,
  });
});

const updateBlog = asyncHandler(async (req, res) => {
  const { id, title, shortDescription, description, author } = req.body;

  // Parse author if it's a JSON string
  let parsedAuthor;
  try {
    parsedAuthor = typeof author === "string" ? JSON.parse(author) : author;
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid author format",
    });
  }

  if (
    !id ||
    !title ||
    !shortDescription ||
    !description ||
    !parsedAuthor?.name
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Blog ID, title, short description, description, and author name are required",
    });
  }

  const blog = await Blog.findById(id);
  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog post not found",
    });
  }

  let authorPhotoUrl = blog.author.photoUrl;
  let thumbnailUrl = blog.thumbnail;

  if (req.files) {
    const { authorPhoto, thumbnail } = req.files;

    if (authorPhoto) {
      const uploadResult = await uploadOnCloudinary(
        authorPhoto[0].path,
        "author-photos"
      );
      if (!uploadResult?.url) {
        return res.status(500).json({
          success: false,
          message: "Error uploading author photo",
        });
      }
      authorPhotoUrl = uploadResult.url;
    }

    if (thumbnail) {
      const uploadResult = await uploadOnCloudinary(
        thumbnail[0].path,
        "blog-thumbnails"
      );
      if (!uploadResult?.url) {
        return res.status(500).json({
          success: false,
          message: "Error uploading blog thumbnail",
        });
      }
      thumbnailUrl = uploadResult.url;
    }
  }

  blog.title = title.trim();
  blog.shortDescription = shortDescription.trim();
  blog.description = description.trim();
  blog.thumbnail = thumbnailUrl;
  blog.author = {
    name: parsedAuthor.name.trim(),
    photoUrl: authorPhotoUrl,
  };

  await blog.save();

  return res.status(200).json({
    success: true,
    message: "Blog post updated successfully",
    data: blog,
  });
});

const getBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const query = search
    ? {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { shortDescription: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { "author.name": { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const blogs = await Blog.find(query)
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await Blog.countDocuments(query);

  return res.status(200).json({
    success: true,
    message: "Blogs retrieved successfully",
    data: {
      blogs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Blog ID is required",
    });
  }

  const blog = await Blog.findByIdAndDelete(id);
  if (!blog) {
    return res.status(404).json({
      success: false,
      message: "Blog post not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Blog post deleted successfully",
  });
});

//meterial controllers
// const createMaterial = asyncHandler(async (req, res, next) => {
//   const { title, price, forCourses, accessControl } = req.body;

//   if (!title || !price || !req.file) {
//     if (req.file) fs.unlinkSync(req.file.path);
//     return res.status(400).json({
//       success: false,
//       message: "Title, price, and PDF file are required",
//     });
//   }

//   let parsedCourses = [];
//   if (forCourses) {
//     try {
//       parsedCourses = JSON.parse(forCourses);
//       if (!Array.isArray(parsedCourses)) {
//         if (req.file) fs.unlinkSync(req.file.path);
//         return res.status(400).json({
//           success: false,
//           message: "forCourses must be an array",
//         });
//       }
//     } catch (error) {
//       if (req.file) fs.unlinkSync(req.file.path);
//       return res.status(400).json({
//         success: false,
//         message: "Invalid forCourses format",
//       });
//     }
//   }

//   const pdfLocalPath = req.file.path;
//   const uploadResult = await uploadPdfOnCloudinary(pdfLocalPath, "materials");
//   if (!uploadResult?.url) {
//     if (fs.existsSync(pdfLocalPath)) fs.unlinkSync(pdfLocalPath);
//     return res.status(500).json({
//       success: false,
//       message: "Error uploading PDF",
//     });
//   }

//   const material = await Material.create({
//     title: title.trim(),
//     contentUrl: uploadResult.url,
//     publicId: uploadResult.public_id,
//     price: price.trim(),
//     forCourses: parsedCourses,
//     accessControl: accessControl || "restricted",
//   });

//   if (!material) {
//     await deletePdfFromCloudinary(uploadResult.url, "materials", "raw");
//     return res.status(500).json({
//       success: false,
//       message: "Error creating material",
//     });
//   }

//   //if parsedCourses is not empty, update the courses
//   if (parsedCourses.length > 0) {
//     const courses = await Course.find({ _id: { $in: parsedCourses } });
//     if (courses.length > 0) {
//       for (const course of courses) {
//         course.materials.push(material._id);
//         await course.save({ validateBeforeSave: false });
//       }
//     } else {
//       // If no valid courses found, delete the material
//       await Material.findByIdAndDelete(material._id);
//       await deletePdfFromCloudinary(uploadResult.url, "materials", "raw");
//       return res.status(400).json({
//         success: false,
//         message: "No valid courses found for the provided IDs",
//       });
//     }
//   }

//   return res.status(201).json({
//     success: true,
//     message: "Material created successfully",
//     data: material,
//   });
// })

import FormData from "form-data";
import { EnrollCourse } from "../models/enrolledcourse.model.js";

const CDN_API = "https://cdn.adletica.com/upload";

const CDN_UPLOAD_URL = "https://cdn.adletica.com/upload";

const createMaterial = asyncHandler(async (req, res) => {
  const { title, price, forCourses, accessControl } = req.body;

  // Validation
  if (!title || !price || !req.files || req.files.length === 0) {
    if (req.files) {
      req.files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    }
    return res.status(400).json({
      success: false,
      message: "Title, price, and at least one PDF file are required",
    });
  }

  // Parse courses
  let parsedCourses = [];
  if (forCourses) {
    try {
      parsedCourses = JSON.parse(forCourses);
      if (!Array.isArray(parsedCourses))
        throw new Error("forCourses must be an array");
    } catch (error) {
      req.files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res
        .status(400)
        .json({ success: false, message: "Invalid forCourses format" });
    }
  }

  // Upload PDFs to CDN
  const uploadedPdfs = [];
  try {
    for (const file of req.files) {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(file.path));

      const response = await axios.post(CDN_UPLOAD_URL, formData, {
        headers: formData.getHeaders(),
      });

      uploadedPdfs.push({
        url: response.data.url,
        publicId: response.data.filename, // 👈 use filename as publicId
      });

      // Delete local temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  } catch (error) {
    console.error("❌ Error uploading to CDN:", error.message);
    req.files.forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    return res
      .status(500)
      .json({ success: false, message: "Error uploading PDFs to CDN" });
  }

  // Save material
  const material = await Material.create({
    title: title.trim(),
    pdfs: uploadedPdfs, // 👈 matches your existing schema
    price: price.trim(),
    forCourses: parsedCourses,
    accessControl: accessControl || "restricted",
  });

  if (parsedCourses.length > 0) {
    await Course.updateMany(
      { _id: { $in: parsedCourses } },
      { $addToSet: { materials: material._id } }
    );
  }

  return res.status(201).json({
    success: true,
    message: "Material created successfully",
    data: material,
  });
});

const getMaterials = asyncHandler(async (req, res, next) => {
  const materials = await Material.find({}).populate("forCourses", "title");
  return res.status(200).json({
    success: true,
    data: materials,
    message: materials.length === 0 ? "No materials found" : undefined,
  });
});

const updateMaterial = asyncHandler(async (req, res, next) => {
  const { _id, title, price, forCourses, accessControl } = req.body;

  if (!_id || !title || !price) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({
      success: false,
      message: "Material ID, title, and price are required",
    });
  }

  const material = await Material.findById(_id);
  if (!material) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({
      success: false,
      message: "Material not found",
    });
  }

  let parsedCourses = material.forCourses;
  if (forCourses) {
    try {
      parsedCourses = JSON.parse(forCourses);
      if (!Array.isArray(parsedCourses)) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: "forCourses must be an array",
        });
      }
    } catch (error) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Invalid forCourses format",
      });
    }
  }

  let contentUrl = material.contentUrl;
  let publicId = material.publicId;

  if (req.file) {
    const pdfLocalPath = req.file.path;
    const uploadResult = await uploadPdfOnCloudinary(pdfLocalPath, "materials");
    if (!uploadResult?.url) {
      if (fs.existsSync(pdfLocalPath)) fs.unlinkSync(pdfLocalPath);
      return res.status(500).json({
        success: false,
        message: "Error uploading new PDF",
      });
    }

    if (material.contentUrl && material.publicId) {
      await deletePdfFromCloudinary(material.contentUrl, "materials", "raw");
    }

    contentUrl = uploadResult.url;
    publicId = uploadResult.public_id;
  }

  material.title = title.trim();
  material.contentUrl = contentUrl;
  material.publicId = publicId;
  material.price = price.trim();
  material.forCourses = parsedCourses;
  material.accessControl = accessControl || material.accessControl;

  await material.save();

  return res.status(200).json({
    success: true,
    message: "Material updated successfully",
    data: material,
  });
});

const deleteMaterial = asyncHandler(async (req, res, next) => {
  const { _id } = req.body;
  if (!_id) {
    return res.status(400).json({
      success: false,
      message: "Material ID is required",
    });
  }

  const material = await Material.findById(_id);
  if (!material) {
    return res.status(404).json({
      success: false,
      message: "Material not found",
    });
  }

  if (material.contentUrl && material.publicId) {
    await deletePdfFromCloudinary(material.contentUrl, "materials", "raw");
  }

  await Material.findByIdAndDelete(_id);

  return res.status(200).json({
    success: true,
    message: "Material deleted successfully",
  });
});

const getCoursesForMaterials = asyncHandler(async (req, res, next) => {
  const courses = await Course.find({})
    .select("title _id courseFor")
    .sort({ createdAt: -1 });

  if (!courses || courses.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No courses found",
    });
  }

  return res.status(200).json({
    success: true,
    data: courses,
    message: "Courses fetched successfully",
  });
});

const getMaterialPaymentRequests = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search ? String(req.query.search).trim() : "";
  const skip = (page - 1) * limit;

  try {
    // Check if any documents are missing createdAt
    const missingCreatedAt = await MaterialPayment.findOne({
      createdAt: { $exists: false },
    });
    if (missingCreatedAt) {
      console.warn(
        "Some MaterialPayment documents are missing createdAt field. Consider running a repair script."
      );
    }

    // Build aggregation pipeline
    const pipeline = [
      // Lookup to join with Student collection
      {
        $lookup: {
          from: "students", // Collection name in MongoDB (lowercase, plural)
          localField: "studentId",
          foreignField: "_id",
          as: "studentId",
        },
      },
      // Unwind studentId to get a single object
      { $unwind: "$studentId" },
      // Lookup to join with Material collection
      {
        $lookup: {
          from: "materials", // Collection name in MongoDB
          localField: "materialId",
          foreignField: "_id",
          as: "materialId",
        },
      },
      // Unwind materialId
      { $unwind: "$materialId" },
      // Match stage for search
      search
        ? {
            $match: {
              $or: [
                { "studentId.fullName": { $regex: search, $options: "i" } },
                {
                  "studentId.registrationNumber": {
                    $regex: search,
                    $options: "i",
                  },
                },
                { "materialId.title": { $regex: search, $options: "i" } },
              ],
            },
          }
        : { $match: {} },
      // Sort by createdAt descending (latest first)
      { $sort: { createdAt: -1 } },
      // Project only needed fields
      {
        $project: {
          _id: 1,
          studentId: {
            fullName: 1,
            email: 1,
            registrationNumber: 1,
          },
          materialId: {
            _id: 1, // Explicitly include _id
            title: 1,
            price: 1,
          },
          paymentMethod: 1,
          mobileNumber: 1,
          transactionId: 1,
          amount: 1,
          status: 1,
          createdAt: 1, // Include for debugging and client-side sorting
        },
      },
    ];

    // Count total matching documents
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await MaterialPayment.aggregate(countPipeline);
    const totalRequests = countResult[0]?.total || 0;

    // Add skip and limit for pagination
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Execute aggregation
    const requests = await MaterialPayment.aggregate(pipeline);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
        limit,
      },
    });
  } catch (error) {
    console.error("Error in getMaterialPaymentRequests:", error);
    next(error);
  }
});

const verifyPaymentMaterial = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { paymentId } = req.body;

  const payment = await MaterialPayment.findById(paymentId);

  if (!payment) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Payment ID" });
  }

  if (payment.status === "verified") {
    return res
      .status(400)
      .json({ success: false, message: "Payment already verified" });
  }

  const material = await Material.findById(id);
  if (!material) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Material ID" });
  }

  if (payment.materialId.toString() !== material._id.toString()) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Material ID match" });
  }

  payment.status = "verified";
  const paymentUpdate = await payment.save();

  //push material to user schema
  const student = await Student.findById(payment.studentId);

  if (!student) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Student ID" });
  }

  student.materials.push(material._id);

  await student.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Verification successful",
  });
});

const deletePaymentMaterial = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { paymentId } = req.body;

  const payment = await MaterialPayment.findById(paymentId);

  if (!payment) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Payment ID" });
  }

  const material = await Material.findById(id);
  if (!material) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid Material ID" });
  }

  const deletePayment = await MaterialPayment.findByIdAndDelete(paymentId);

  return res.status(200).json({
    success: true,
    message: "Deletion successful",
  });
});

export {
  clearNotifications,
  createAdmin,
  createBlog,
  createCourse,
  createMaterial,
  createNotice,
  createStaff,
  createStudent,
  deleteBlog,
  deleteClass,
  deleteCourse,
  deleteMaterial,
  deleteNotice,
  deleteNotification,
  deletePayment,
  deletePaymentMaterial,
  deleteStaff,
  deleteStudent,
  getAdmin,
  getBlogs,
  getClasses,
  getCourses,
  getCoursesForMaterials,
  getInvoices,
  getMaterialPaymentRequests,
  getMaterials,
  getNotice,
  getNotification,
  getPendingPayments,
  getRoundedChartData,
  getSingleCourse,
  getStaffs,
  getStudents,
  loginAdmin,
  sendNotification,
  stopLiveClass,
  updateBlog,
  updateCourse,
  updateMaterial,
  updateNotificationReadStatus,
  updateStaff,
  updateStudent,
  verifyPayment,
  verifyPaymentMaterial,
};
