import { Router } from "express";
import {
  clearNotifications,
  createAdmin,
  createBlog,
  createCourse,
  createFreeClass,
  createLiveClass,
  createMaterial,
  createNotice,
  createRecordedClass,
  createStaff,
  createStudent,
  deleteBlog,
  deleteClass,
  deleteCourse,
  deleteFreeClass,
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
  getFreeClasses,
  getInvoices,
  getMaterialPaymentRequests,
  getMaterials,
  getNotice,
  getNotification,
  getPendingPayments,
  getRoundedChartData,
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
} from "../controllers/admin.controller.js";
import { upload } from "../middlewares/multer.js";
import { uploadPdf } from "../middlewares/multerPDF.js";
import { verifyAdminJwt } from "./../middlewares/verifyAdminJwt.js";

const router = Router();

router.route("/create-admin").post(upload.single("avatar"), createAdmin);
router.route("/login").post(loginAdmin);
router.route("/get-admin").get(verifyAdminJwt, getAdmin);

// Staff routes
router.route("/get-staffs").get(verifyAdminJwt, getStaffs);
router
  .route("/update-staff")
  .post(verifyAdminJwt, upload.single("avatar"), updateStaff);
router
  .route("/create-staff")
  .post(verifyAdminJwt, upload.single("avatar"), createStaff);
router.route("/delete-staff").post(verifyAdminJwt, deleteStaff);

// Student routes
router.route("/get-students").get(verifyAdminJwt, getStudents);
router
  .route("/update-student")
  .post(verifyAdminJwt, upload.single("avatar"), updateStudent);
router
  .route("/create-student")
  .post(verifyAdminJwt, upload.single("avatar"), createStudent);
router.route("/delete-student").post(verifyAdminJwt, deleteStudent);

// Course and Class routes
router.route("/get-courses").get(verifyAdminJwt, getCourses);
router.route("/get-classes").get(verifyAdminJwt, getClasses);
router.route("/delete-class").post(verifyAdminJwt, deleteClass);
router.route("/stop-live-class").post(verifyAdminJwt, stopLiveClass);

router
  .route("/create-live-class")
  .post(verifyAdminJwt, upload.none(), createLiveClass);
router
  .route("/create-recorded-class")
  .post(verifyAdminJwt, upload.single("video"), createRecordedClass);
router.route("/create-course").post(
  verifyAdminJwt,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "instructorImages", maxCount: 10 },
  ]),
  createCourse
);
router.route("/update-course").post(
  verifyAdminJwt,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "instructorImages", maxCount: 10 },
  ]),
  updateCourse
);
router.route("/delete-course").post(verifyAdminJwt, deleteCourse);

// Free Class routes
router
  .route("/create-free-class")
  .post(verifyAdminJwt, upload.none(), createFreeClass);
router.route("/get-free-classes").get(verifyAdminJwt, getFreeClasses);
router.route("/delete-free-class").post(verifyAdminJwt, deleteFreeClass);

// Notification routes
router.route("/send-notification").post(verifyAdminJwt, sendNotification);
router.route("/get-notification").get(verifyAdminJwt, getNotification);
router
  .route("/update-notification")
  .post(verifyAdminJwt, updateNotificationReadStatus);
router.route("/delete-notification").post(verifyAdminJwt, deleteNotification);
router.route("/clear-notifications").post(verifyAdminJwt, clearNotifications);

// Chart data routes
router
  .route("/get-rounded-chart-data")
  .get(verifyAdminJwt, getRoundedChartData);

// Payment Verification
router.route("/get-pending-payments").get(verifyAdminJwt, getPendingPayments);
router.route("/verify-payment").post(verifyAdminJwt, verifyPayment);
router.route("/delete-payment").post(verifyAdminJwt, deletePayment);

//notice
router.route("/create-notice").post(verifyAdminJwt, createNotice);
router.route("/get-notice").get(verifyAdminJwt, getNotice);
router.route("/delete-notice").post(verifyAdminJwt, deleteNotice);

//get invoices
router.route("/get-invoices").post(verifyAdminJwt, getInvoices);

//blog post
router.route("/create-blog").post(
  verifyAdminJwt,
  upload.fields([
    { name: "authorPhoto", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createBlog
);
router.route("/get-blogs").get(verifyAdminJwt, getBlogs);
router.route("/update-blog").post(
  verifyAdminJwt,
  upload.fields([
    { name: "authorPhoto", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  updateBlog
);
router.route("/delete-blog").post(verifyAdminJwt, deleteBlog);

// Material routes
// router
//   .route("/create-material")
//   .post(verifyAdminJwt, uploadPdf.single("pdf"), createMaterial);

router
  .route("/create-material")
  .post(verifyAdminJwt, uploadPdf.array("pdfs", 10), createMaterial);

router.route("/get-materials").get(verifyAdminJwt, getMaterials);
router
  .route("/update-material")
  .post(verifyAdminJwt, uploadPdf.single("pdf"), updateMaterial);
router.route("/delete-material").post(verifyAdminJwt, deleteMaterial);
router
  .route("/get-material-payment-requests")
  .get(verifyAdminJwt, getMaterialPaymentRequests);
router
  .route("/verify-material-payment/:id")
  .post(verifyAdminJwt, verifyPaymentMaterial);
router
  .route("/delete-material-payment/:id")
  .post(verifyAdminJwt, deletePaymentMaterial);
router
  .route("/get-courses-for-materials")
  .get(verifyAdminJwt, getCoursesForMaterials);

export default router;
