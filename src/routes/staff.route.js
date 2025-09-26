import { Router } from "express";
import {
  clearNotifications,
  createBlog,
  createCourse,
  createLiveClass,
  createMaterial,
  createNotice,
  createRecordedClass,
  createStaff,
  createStudent,
  createTeacher,
  deleteBlog,
  deleteClass,
  deleteCourse,
  deleteMaterial,
  deleteNotice,
  deleteNotification,
  deletePayment,
  deletePaymentMaterial,
  deleteStudent,
  deleteTeacher,
  getAdmins,
  getBlogs,
  getClasses,
  getCourses,
  getCoursesForMaterials,
  getMaterialPaymentRequests,
  getMaterials,
  getNotification,
  getPendingPayments,
  getRoundedChartData,
  getStaff,
  getStudents,
  getTeachers,
  loginStaff,
  sendNotification,
  stopLiveClass,
  updateBlog,
  updateCourse,
  updateMaterial,
  updateNotificationReadStatus,
  updateStudent,
  updateTeacher,
  verifyPayment,
  verifyPaymentMaterial,
} from "../controllers/staff.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyStaffJwt } from "../middlewares/verifyStaffJwt.js";
import { uploadPdf } from "./../middlewares/multerPDF.js";

const router = Router();

router.route("/create-staff").post(createStaff);
router.route("/login").post(loginStaff);
router.route("/get-staff").get(verifyStaffJwt, getStaff);

router.route("/get-students").get(verifyStaffJwt, getStudents);
router.route("/get-admins").get(verifyStaffJwt, getAdmins);
router
  .route("/update-student")
  .post(verifyStaffJwt, upload.single("avatar"), updateStudent);
router
  .route("/create-student")
  .post(verifyStaffJwt, upload.single("avatar"), createStudent);
router.route("/delete-student").post(verifyStaffJwt, deleteStudent);

router.route("/get-courses").get(verifyStaffJwt, getCourses);
router.route("/create-course").post(
  verifyStaffJwt,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "instructorImages", maxCount: 10 },
  ]),
  createCourse
);
router.route("/update-course").post(
  verifyStaffJwt,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "instructorImages", maxCount: 10 },
  ]),
  updateCourse
);
router.route("/delete-course").post(verifyStaffJwt, deleteCourse);

router.route("/send-notification").post(verifyStaffJwt, sendNotification);
router.route("/get-notification").get(verifyStaffJwt, getNotification);
router
  .route("/update-notification")
  .post(verifyStaffJwt, updateNotificationReadStatus);
router.route("/delete-notification").post(verifyStaffJwt, deleteNotification);
router.route("/clear-notifications").post(verifyStaffJwt, clearNotifications);

// Classes
router.route("/get-classes").get(verifyStaffJwt, getClasses);
router
  .route("/create-live-class")
  .post(verifyStaffJwt, upload.none(), createLiveClass);
router
  .route("/create-recorded-class")
  .post(verifyStaffJwt, upload.single("video"), createRecordedClass);
router.route("/delete-class").post(verifyStaffJwt, deleteClass);
router.route("/stop-live-class").post(verifyStaffJwt, stopLiveClass);

// Payment Verification
router.route("/get-pending-payments").get(verifyStaffJwt, getPendingPayments);
router.route("/verify-payment").post(verifyStaffJwt, verifyPayment);
router.route("/delete-payment").post(verifyStaffJwt, deletePayment);

//chart data routes
router
  .route("/get-rounded-chart-data")
  .get(verifyStaffJwt, getRoundedChartData);

//notice
router.route("/create-notice").post(verifyStaffJwt, createNotice);
router.route("/delete-notice").post(verifyStaffJwt, deleteNotice);

// Teacher routes
router.route("/get-teachers").get(verifyStaffJwt, getTeachers);
router
  .route("/create-teacher")
  .post(verifyStaffJwt, upload.single("avatar"), createTeacher);
router
  .route("/update-teacher")
  .post(verifyStaffJwt, upload.single("avatar"), updateTeacher);
router.route("/delete-teacher").post(verifyStaffJwt, deleteTeacher);

//blog post
router.route("/create-blog").post(
  verifyStaffJwt,
  upload.fields([
    { name: "authorPhoto", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createBlog
);
router.route("/get-blogs").get(verifyStaffJwt, getBlogs);
router.route("/update-blog").post(
  verifyStaffJwt,
  upload.fields([
    { name: "authorPhoto", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  updateBlog
);
router.route("/delete-blog").post(verifyStaffJwt, deleteBlog);

// Material routes
router
  .route("/create-material")
  .post(verifyStaffJwt, uploadPdf.single("pdf"), createMaterial);
router.route("/get-materials").get(verifyStaffJwt, getMaterials);
router
  .route("/update-material")
  .post(verifyStaffJwt, uploadPdf.single("pdf"), updateMaterial);
router.route("/delete-material").post(verifyStaffJwt, deleteMaterial);
router
  .route("/get-material-payment-requests")
  .get(verifyStaffJwt, getMaterialPaymentRequests);
router
  .route("/verify-material-payment/:id")
  .post(verifyStaffJwt, verifyPaymentMaterial);
router
  .route("/delete-material-payment/:id")
  .post(verifyStaffJwt, deletePaymentMaterial);

router
  .route("/get-courses-for-materials")
  .get(verifyStaffJwt, getCoursesForMaterials);

export default router;
