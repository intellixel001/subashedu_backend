import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Material } from "../models/Material.model.js";
import { Course } from "../models/course.model.js";
import { EnrollCourse } from "../models/enrolledcourse.model.js";
import { Payment } from "../models/payment.model.js";
import { Student } from "../models/student.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Class } from "./../models/Class.model.js";
import { MaterialPayment } from "./../models/MaterialPayment.model.js";
import { Admin } from "./../models/admin.model.js";
import { Notification } from "./../models/notification.model.js";
import { Staff } from "./../models/staff.model.js";

const generateAccessAndRefreshToken = async (studentId) => {
  try {
    const student = await Student.findById(studentId);
    const accessToken = await student.generateAccessToken();
    const refreshToken = await student.generateRefreshToken();

    student.refreshToken = refreshToken;
    await student.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new ApiError(500, "Error generating access & refresh tokens");
  }
};

const registerStudent = asyncHandler(async function (req, res, next) {
  try {
    const {
      fullName,
      email,
      phone,
      educationLevel,
      institution,
      sscYear = "",
      hscYear = "",
      fatherName = "",
      motherName = "",
      guardianPhone = "",
      password,
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!fullName)
      missingFields.push({
        path: ["fullName"],
        message: "Full name is required",
      });
    if (!email)
      missingFields.push({ path: ["email"], message: "Email is required" });
    if (!phone)
      missingFields.push({
        path: ["phone"],
        message: "Phone number is required",
      });
    if (!educationLevel)
      missingFields.push({
        path: ["educationLevel"],
        message: "Education level is required",
      });
    if (!institution)
      missingFields.push({
        path: ["institution"],
        message: "Institution name is required",
      });
    if (!password)
      missingFields.push({
        path: ["password"],
        message: "Password is required",
      });

    if (missingFields.length > 0) {
      res.setHeader("Content-Type", "application/json");
      throw new ApiError(400, "Missing required fields", missingFields);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.setHeader("Content-Type", "application/json");
      throw new ApiError(400, "Invalid email format", [
        { path: ["email"], message: "Invalid email address" },
      ]);
    }

    // Validate phone format (11 digits)
    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(phone)) {
      res.setHeader("Content-Type", "application/json");
      throw new ApiError(400, "Invalid phone number", [
        { path: ["phone"], message: "Phone number must be 11 digits" },
      ]);
    }

    // Check if user already exists
    const isAlreadyExists = await Student.findOne({ email });
    if (isAlreadyExists) {
      res.setHeader("Content-Type", "application/json");
      throw new ApiError(409, "User already exists with this email", [
        { path: ["email"], message: "Email is already registered" },
      ]);
    }

    // Generate registration number
    const lastDocument = await Student.findOne().sort({ _id: -1 });
    let newRegistrationNumber;
    if (lastDocument) {
      newRegistrationNumber = parseInt(lastDocument.registrationNumber) + 1;
    } else {
      const defaultNumber = process.env.CURRENT_STUDENT_NUMBER || "1000";
      if (!defaultNumber || isNaN(parseInt(defaultNumber))) {
        res.setHeader("Content-Type", "application/json");
        throw new ApiError(500, "Invalid CURRENT_STUDENT_NUMBER configuration");
      }
      newRegistrationNumber = parseInt(defaultNumber) + 1;
    }

    // Create student
    const student = await Student.create({
      registrationNumber: newRegistrationNumber.toString(),
      fullName,
      email,
      phone,
      educationLevel,
      institution,
      sscYear,
      hscYear,
      fatherName,
      motherName,
      guardianPhone,
      password,
    });

    if (!student) {
      res.setHeader("Content-Type", "application/json");
      throw new ApiError(500, "Error creating new student profile");
    }

    res.setHeader("Content-Type", "application/json");
    return res
      .status(201)
      .json(new ApiResponse(201, "User registered successfully", {}));
  } catch (error) {
    console.error("Unexpected error in registerStudent:", error);
    res.setHeader("Content-Type", "application/json");
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      errors: [],
    });
  }
});

const currentStudent = asyncHandler(async function (req, res, next) {
  const student = req.student;
  const courseId = req.query.courseId?.toString();

  if (!student) {
    throw new ApiError(401, "Unauthorized: No student found in request");
  }

  let payment = null;
  let isEnrolled = false;

  if (courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new ApiError(400, "Invalid course ID format");
    }

    payment = await Payment.findOne({
      studentId: student._id,
      courseId,
    }).select("status studentId courseId");

    isEnrolled =
      student.coursesEnrolled?.some(
        (course) => course.toString() === courseId
      ) || false;
  }

  return res.status(200).json(
    new ApiResponse(200, "Student data retrieved", {
      student: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        coursesEnrolled: student.coursesEnrolled,
        materials: student.materials,
      },
      payment,
      isEnrolled,
    })
  );
});

const loginStudent = asyncHandler(async function (req, res, next) {
  const { loginId, password } = req.body;

  if (!(loginId && password)) {
    return res.status(400).json({
      success: false,
      message: "Enter valid credentials",
      data: null,
    });
  }

  const student = await Student.findOne({
    $or: [{ email: loginId }, { registrationNumber: loginId }],
  }).select("+password");

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found",
      data: null,
    });
  }

  const isPasswordCorrect = await student.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    return res.status(400).json({
      success: false,
      message: "Wrong password!",
      data: null,
    });
  }

  const loggedInUser = await Student.findById(student._id).select(
    "-password -refreshToken"
  );

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    loggedInUser._id
  );

  if (!(accessToken || refreshToken)) {
    throw new ApiError(500, "Error generating tokens");
  }
  const options = {
    httpOnly: true,
    secure: process.env.SERVER_STATE === "production",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, "Student successfully logged in", loggedInUser));
});

const refreshAccessToken = asyncHandler(async function (req, res, next) {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unauthorized request");
  }

  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await Student.findById(decodedRefreshToken._id).select(
      "-password"
    );

    if (!user) {
      throw new ApiError(400, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(400, "Refresh token is expired or used.");
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: process.env.SERVER_STATE === "production",
      path: "/",
    };

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Access and Refresh token refreshed successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token!");
  }
});

const paymentSubmit = asyncHandler(async (req, res, next) => {
  try {
    const {
      studentId,
      courseId,
      paymentMethod,
      mobileNumber,
      transactionId,
      amount,
      terms,
    } = req.body;

    if (
      !studentId ||
      !courseId ||
      !paymentMethod ||
      !mobileNumber ||
      !transactionId ||
      !amount ||
      terms !== true
    ) {
      throw new ApiError(
        400,
        "All fields are required, and terms must be accepted."
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      throw new ApiError(400, "Invalid student or course ID format.");
    }

    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "Course not found.");
    }

    if (Number(amount) !== course.offer_price) {
      throw new ApiError(400, `Amount must be exactly ৳${course.offer_price}.`);
    }

    const isAlreadyEnrolled = student.coursesEnrolled.some(
      (course) => course.toString() === courseId
    );

    if (isAlreadyEnrolled) {
      throw new ApiError(409, "You are already enrolled in this course.");
    }

    const existingPayment = await Payment.findOne({
      studentId,
      courseId,
      status: { $in: ["pending", "verified"] },
    });

    if (existingPayment) {
      throw new ApiError(409, "Payment already exists for this course.");
    }

    let payment;
    try {
      payment = await Payment.create({
        studentId,
        courseId,
        paymentMethod,
        mobileNumber,
        transactionId,
        amount: Number(amount),
        termsAccepted: terms,
        status: "pending",
      });
    } catch (error) {
      console.error("Error creating payment record:", error);
      throw new ApiError(500, "Failed to create payment record.");
    }

    return res.status(201).json(
      new ApiResponse(201, "Payment submitted successfully.", {
        paymentId: payment._id,
        student: {
          _id: student._id,
          fullName: student.fullName,
          email: student.email,
        },
        course: {
          _id: course._id,
          title: course.title,
          price: course.price,
        },
      })
    );
  } catch (error) {
    console.error("Error in paymentSubmit:", error);
    next(error);
  }
});

const paymentRequest = asyncHandler(async (req, res, next) => {
  const { studentId, courseId } = req.body;

  if (
    !studentId ||
    !courseId ||
    !mongoose.Types.ObjectId.isValid(studentId) ||
    !mongoose.Types.ObjectId.isValid(courseId)
  ) {
    throw new ApiError(400, "Valid studentId and courseId are required.");
  }

  const paymentDoc = await Payment.findOne({
    studentId,
    courseId,
  });

  return res.status(200).json(
    new ApiResponse(200, "Payment request status retrieved", {
      payment: paymentDoc || null,
    })
  );
});

const purchaseCourseController = asyncHandler(async (req, res, next) => {
  const { id: courseId } = req.params;
  const { paymentMethod, transactionId } = req.body;

  // get student from auth middleware
  const student = req?.student;
  if (!student) {
    throw new ApiError(401, "Unauthorized");
  }

  // find course
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Check if student already enrolled in this course
  const alreadyEnrolled = await EnrollCourse.findOne({
    userid: student._id.toString(),
    id: course._id.toString(),
  });

  if (alreadyEnrolled) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          "You have already purchased/enrolled in this course"
        )
      );
  }

  // Map lessons with status
  const lessonsArray = course.lessons.map((lesson) => ({
    name: lesson.name,
    _id: lesson._id,
    status: "locked",
  }));

  // Create enroll doc
  const enrollData = await EnrollCourse.create({
    id: course._id.toString(),
    userid: student._id.toString(),
    tranjectionid: transactionId,
    materials: course.materials || [],
    type: course.offer_price > 0 ? "paid" : "free",
    paymentMethod,
    status: "pending",
    enrollcourse: lessonsArray,
  });

  await Student.updateOne(
    { _id: student._id },
    { $addToSet: { coursesEnrolled: enrollData._id } }
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Course purchase request submitted", enrollData)
    );
});

const getLiveClasses = asyncHandler(async (req, res, next) => {
  const { _id: studentId } = req.student;

  if (!studentId) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID",
    });
  }

  const student = await Student.findById(studentId).select(
    "-password -refreshToken"
  );

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  const enrolledCourses = student.coursesEnrolled || [];

  if (enrolledCourses.length === 0) {
    return res.status(400).json({
      success: false,
      message: "You're not enrolled in any course.",
    });
  }

  // normalize enrolled course IDs
  const enrolledCourseIds = enrolledCourses.map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
  );

  // fetch live classes from enrolled courses
  const liveClasses = await Class.find({
    courseId: { $in: enrolledCourseIds },
  })
    .populate("courseId", "title courseFor")
    .select("title subject courseId type startTime image isActiveLive");

  // fetch ALL classes
  let allClasses = await Class.find()
    .populate("courseId", "title courseFor")
    .select(
      "title subject instructorId courseId courseType billingType type startTime image isActiveLive"
    );

  // remove classes already in liveClasses from allClasses
  const liveClassIds = liveClasses.map((cls) => cls._id.toString());
  allClasses = allClasses.filter(
    (cls) => !liveClassIds.includes(cls._id.toString())
  );

  return res.status(200).json({
    success: true,
    message: "Classes retrieved successfully.",
    data: {
      live: liveClasses || [],
      all: allClasses || [],
    },
  });
});

const getClassById = asyncHandler(async (req, res, next) => {
  const { classId } = req.params;
  const { _id: studentId } = req.student;

  if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
    throw new ApiError(400, "Invalid class ID");
  }

  const classData = await Class.findById(classId).populate("course", "title");

  if (!classData) {
    throw new ApiError(404, "Class not found");
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  const isEnrolled = student.coursesEnrolled.some(
    (course) => course.toString() === classData.course._id.toString()
  );

  if (!isEnrolled) {
    throw new ApiError(403, "You are not enrolled in this course");
  }

  return res.status(200).json(
    new ApiResponse(200, "Class retrieved successfully", {
      data: classData,
    })
  );
});

const getMyCourses = asyncHandler(async (req, res, next) => {
  const { _id: studentId } = req.student;

  // Find enrollments and populate course info
  const enrollments = await EnrollCourse.find({ userid: studentId })
    .lean()
    .populate({
      path: "id",
      model: Course,
      select:
        "title short_description subjects thumbnailUrl instructors offer_price price courseFor",
    });

  if (!enrollments || enrollments.length === 0) {
    return res.status(200).json({
      success: true,
      data: [],
      message: "No enrolled courses found.",
    });
  }

  // Map enrollments to include course info
  const data = enrollments.map((enroll) => ({
    _id: enroll._id,
    status: enroll.status,
    paymentMethod: enroll.paymentMethod,
    transactionId: enroll.tranjectionid,
    course: enroll.id,
    createdAt: enroll.createdAt,
  }));

  return res.status(200).json({
    success: true,
    data,
    message: "Fetched successfully!",
  });
});

const getCourseClasses = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const student = await req.student;

  const isEnrolled = student.coursesEnrolled.some((id) => {
    return id.toString() === courseId;
  });

  if (!isEnrolled) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course ID " });
  }

  const courseWithClasses = await Course.findById(courseId);

  if (!courseWithClasses) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course ID" });
  }

  return res.status(200).json({
    success: true,
    message: "Successfully fetched data",
    data: courseWithClasses,
  });
});

const getCourseClassesVideos = asyncHandler(async (req, res, next) => {
  const { courseId, subjectName } = req.params;
  const student = await req.student;

  const isEnrolled = student.coursesEnrolled.some((id) => {
    return id.toString() === courseId;
  });

  if (!isEnrolled) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course ID " });
  }

  const courseWithClassesAndVideos = await Course.findById(courseId)
    .populate("classes")
    .select("-description");

  if (!courseWithClassesAndVideos) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course ID" });
  }

  const filteredClasses = courseWithClassesAndVideos.classes.filter((cls) => {
    return cls.subject.toLowerCase() === subjectName.toLowerCase();
  });

  return res.status(200).json({
    success: true,
    message: "Successfully fetched data",
    data: filteredClasses,
  });
});

const getNotifications = asyncHandler(async (req, res, next) => {
  const studentId = req.student?._id;

  const notifications = await Notification.find({
    sentTo: studentId,
    deletedByRecipient: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  const populatedNotifications = await Promise.all(
    notifications.map(async (notification) => {
      let sentBy = null;
      if (notification.sentByModel === "Admin") {
        sentBy = await Admin.findById(notification.sentBy).select(
          "fullName email photoUrl"
        );
      } else if (notification.sentByModel === "Staff") {
        sentBy = await Staff.findById(notification.sentBy).select(
          "fullName email photoUrl"
        );
      } else if (notification.sentByModel === "Student") {
        sentBy = await Student.findById(notification.sentBy).select(
          "fullName email photoUrl"
        );
      }
      return { ...notification, sentBy };
    })
  );

  return res.status(200).json(
    new ApiResponse(200, "Notifications retrieved successfully", {
      notifications: populatedNotifications,
    })
  );
});

const updateNotificationReadStatus = asyncHandler(async (req, res, next) => {
  const { notificationIds } = req.body;
  const studentId = req.student?._id;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    throw new ApiError(400, "Notification IDs array is required");
  }

  const result = await Notification.updateMany(
    {
      _id: { $in: notificationIds },
      sentTo: studentId,
      deletedByRecipient: false,
    },
    { $set: { readReceipt: true } }
  );

  return res.status(200).json(
    new ApiResponse(200, "Notifications marked as read", {
      modifiedCount: result.modifiedCount,
    })
  );
});

const deleteNotification = asyncHandler(async (req, res, next) => {
  const { notificationId } = req.body;
  const studentId = req.student?._id;

  if (!notificationId) {
    throw new ApiError(400, "Notification ID is required");
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    sentTo: studentId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  notification.deletedByRecipient = true;
  await notification.save();

  if (notification.deletedBySender) {
    await Notification.findByIdAndDelete(notificationId);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Notification deleted successfully"));
});

const clearNotifications = asyncHandler(async (req, res, next) => {
  const studentId = req.student?._id;

  await Notification.updateMany(
    {
      sentTo: studentId,
      deletedByRecipient: false,
    },
    { $set: { deletedByRecipient: true } }
  );

  await Notification.deleteMany({
    deletedBySender: true,
    deletedByRecipient: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "All notifications cleared successfully"));
});

const sendNotification = asyncHandler(async (req, res, next) => {
  const { message, sentTo } = req.body;
  const studentId = req.student?._id;

  if (!message || !sentTo) {
    throw new ApiError(400, "Message and recipient ID are required");
  }

  let sentToModel = null;
  const admin = await Admin.findById(sentTo);
  if (admin) {
    sentToModel = "Admin";
  } else {
    const staff = await Staff.findById(sentTo);
    if (staff) {
      sentToModel = "Staff";
    } else {
      throw new ApiError(404, "Recipient not found");
    }
  }

  const notification = await Notification.create({
    sentBy: studentId,
    sentByModel: "Student",
    sentTo,
    sentToModel,
    message,
    readReceipt: false,
    deletedBySender: false,
    deletedByRecipient: false,
  });

  return res.status(201).json(
    new ApiResponse(201, "Notification sent successfully", {
      notification,
    })
  );
});

const getSenders = asyncHandler(async (req, res, next) => {
  const studentId = req.student?._id;

  // Find unread notifications sent to the student by admins or staff
  const notifications = await Notification.find({
    sentTo: studentId,
    sentByModel: { $in: ["Admin", "Staff"] },
    readReceipt: false,
    deletedByRecipient: false,
  }).select("sentBy");

  // Extract unique sender IDs
  const senderIds = Array.from(
    new Set(notifications.map((notification) => notification.sentBy.toString()))
  );

  // Fetch admins and staff who match the sender IDs
  const admins = await Admin.find({
    _id: { $in: senderIds },
  }).select("_id fullName email photoUrl");

  const staff = await Staff.find({
    _id: { $in: senderIds },
  }).select("_id fullName email photoUrl");

  const senders = [
    ...admins.map((admin) => ({
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      photoUrl: admin.photoUrl,
      role: "Admin",
    })),
    ...staff.map((staff) => ({
      _id: staff._id,
      fullName: staff.fullName,
      email: staff.email,
      photoUrl: staff.photoUrl,
      role: "Staff",
    })),
  ];

  return res
    .status(200)
    .json(new ApiResponse(200, "Senders retrieved successfully", senders));
});

//free courses

const getMaterialPaymentStatus = asyncHandler(async (req, res, next) => {
  const { materialId } = req.params;
  const studentId = req.student?._id;

  if (!mongoose.Types.ObjectId.isValid(materialId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid material ID",
    });
  }

  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Student ID not found",
    });
  }

  const payment = await MaterialPayment.findOne({
    materialId,
    studentId,
  }).select("status");

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "No payment found for this material",
      data: null,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Payment status retrieved successfully",
    data: payment,
  });
});

const submitMaterialPayment = asyncHandler(async (req, res, next) => {
  const {
    studentId,
    materialId,
    paymentMethod,
    mobileNumber,
    transactionId,
    amount,
    termsAccepted,
  } = req.body;

  if (
    !studentId ||
    !materialId ||
    !paymentMethod ||
    !mobileNumber ||
    !transactionId ||
    !amount ||
    !termsAccepted
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  try {
    const payment = await MaterialPayment.create({
      studentId,
      materialId,
      paymentMethod,
      mobileNumber,
      transactionId,
      amount,
      termsAccepted,
    });

    return res.status(201).json({
      success: true,
      message: "Material payment submitted successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error submitting material payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting material payment",
    });
  }
});

const getStudentMaterials = asyncHandler(async (req, res, next) => {
  const studentId = req.student?._id;
  if (!studentId) {
    return res
      .status(404)
      .json({ success: false, message: "student not found" });
  }

  // 1. Load student with direct materials
  const student = await Student.findById(studentId).populate(
    "materials",
    "title forCourses price createdAt"
  );

  if (!student) {
    return res
      .status(404)
      .json({ success: false, message: "student not found again lol" });
  }

  const directMaterials = student.materials || [];

  // 2. Get enrolled course references (EnrolledCourse IDs)
  const enrolledCourseIds = (student.coursesEnrolled || []).map((id) =>
    String(id)
  );

  // 3. Load enrolled course docs
  const enrolledCourses = await EnrollCourse.find({
    _id: { $in: enrolledCourseIds },
    status: "approved",
  }).select("id");

  // 4. Extract the real course IDs
  const realCourseIds = enrolledCourses.map((e) => e.id);

  // 5. Fetch courses with those IDs
  const courses = await Course.find({ _id: { $in: realCourseIds } });

  // 6. Collect all material ids
  const enrolledMaterialIds = courses.flatMap((c) =>
    Array.isArray(c.materials) ? c.materials : []
  );

  // 7. Fetch enrolled materials
  const enrolledMaterials = await Material.find({
    _id: { $in: enrolledMaterialIds },
  }).select("title forCourses price createdAt");

  // 8. Combine, dedupe, sort
  const combined = [...directMaterials, ...enrolledMaterials];

  const uniqueSortedMaterials = Array.from(
    new Map(combined.map((mat) => [String(mat._id), mat])).values()
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json({
    success: true,
    message: "successfully fetched",
    data: uniqueSortedMaterials,
  });
});

const getSingleClass = asyncHandler(async (req, res, next) => {
  const classId = req.params.id;
  const student = req.student;

  if (!classId) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid class ID" });
  }

  // 1️⃣ Get enrollIds from student
  const enrollIds =
    student?.coursesEnrolled?.map((id) => new mongoose.Types.ObjectId(id)) ||
    [];

  // 2️⃣ Get actual courseIds from EnrollCourse collection
  const enrolledCourses = await EnrollCourse.find({
    _id: { $in: enrollIds },
  }).select("id");

  const courseIds = enrolledCourses.map((e) => e.id.toString());

  // 3️⃣ Get the class
  const actualClass = await Class.findOne({ _id: classId });
  if (!actualClass) {
    return res.status(404).json({ success: false, message: "Class not found" });
  }

  // 4️⃣ Check if the class belongs to one of the student’s courses
  const isEnrolled = courseIds.includes(actualClass.courseId.toString());

  if (isEnrolled) {
    // full access
    return res.status(200).json({
      success: true,
      message: "Successfully fetched enrolled class",
      data: actualClass,
    });
  }

  // restricted view
  const publicClass = await Class.findById(classId).select(
    "title subject courseId type startTime image isActiveLive"
  );

  return res.status(200).json({
    success: true,
    message: "Successfully fetched public class",
    id: publicClass?.courseId,
  });
});

export {
  clearNotifications,
  currentStudent,
  deleteNotification,
  getClassById,
  getCourseClasses,
  getCourseClassesVideos,
  getLiveClasses,
  getMaterialPaymentStatus,
  getMyCourses,
  getNotifications,
  getSenders,
  getSingleClass,
  getStudentMaterials,
  loginStudent,
  paymentRequest,
  paymentSubmit,
  purchaseCourseController,
  refreshAccessToken,
  registerStudent,
  sendNotification,
  submitMaterialPayment,
  updateNotificationReadStatus,
};
