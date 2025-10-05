import { Router } from "express";
import {
  clearNotifications,
  currentStudent,
  deleteNotification,
  getClassById,
  getCourseClasses,
  getCourseClassesVideos,
  getLiveClasses,
  getMaterialPaymentStatus,
  getMyCourses,
  getMyEnrolledCourses,
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
} from "../controllers/student.controller.js";
import {
  getCourseContent,
  getMyEnrolledCourse,
  getMySinglematerial,
} from "../modules/student.course.js";
import { verifyJwt } from "./../middlewares/verifyJwt.js";

const router = Router();

router.route("/register").post(registerStudent);
router.route("/login").post(loginStudent);
router.route("/current-student").get(verifyJwt, currentStudent);
router.route("/refresh-accesstoken").post(refreshAccessToken);
router.route("/payment-submit").post(verifyJwt, paymentSubmit);
router.route("/payment-request").post(verifyJwt, paymentRequest);
router.route("/course/purchase/:id").post(verifyJwt, purchaseCourseController);

router.route("/classes").get(verifyJwt, getLiveClasses);
router.route("/class/:classId").get(verifyJwt, getClassById);
router.route("/my-courses").get(verifyJwt, getMyCourses);
router.route("/my-enrolled-courses").get(verifyJwt, getMyEnrolledCourses);

router
  .route("/get-course-classes-subjects/:courseId")
  .get(verifyJwt, getCourseClasses);
router
  .route("/get-course-classes-videos/:courseId/:subjectName")
  .get(verifyJwt, getCourseClassesVideos);

router.route("/get-notifications").get(verifyJwt, getNotifications);
router
  .route("/update-notification")
  .post(verifyJwt, updateNotificationReadStatus);
router.route("/delete-notification").post(verifyJwt, deleteNotification);
router.route("/clear-notifications").post(verifyJwt, clearNotifications);
router.route("/send-notification").post(verifyJwt, sendNotification);
router.route("/get-senders").get(verifyJwt, getSenders);

router
  .route("/material-payment-status/:materialId")
  .get(verifyJwt, getMaterialPaymentStatus);
router
  .route("/submit-material-payment-request")
  .post(verifyJwt, submitMaterialPayment);

router.route("/get-single-class/:id").get(verifyJwt, getSingleClass);
router.route("/get-student-materials").get(verifyJwt, getStudentMaterials);
router.route("/get-enrolled-course/:id").get(verifyJwt, getMyEnrolledCourse);
router.route("/get-mysingle-material/:id").get(verifyJwt, getMySinglematerial);
router.route("/get-course-content").get(verifyJwt, getCourseContent);

export default router;
