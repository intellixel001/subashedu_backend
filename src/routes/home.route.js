import { Router } from "express";
import {
  getAllCourse,
  getBlog,
  getBlogs,
  getByTypeCourse,
  getCourse,
  getCoursesByCategory,
  getFreeCLass,
  getHomePageData,
  getMaterialForPurchase,
  getMaterials,
  getNotice,
  getSingleCourse,
  homeController,
  searchCourses,
} from "../controllers/home.controller.js";

const router = Router();

router.route("").get(homeController);
router.route("/get-homepage-data").get(getHomePageData);
router.route("/course/:id").get(getCourse);
router.route("/get-all-course").get(getAllCourse);
router.route("/get-single-course/:id").get(getSingleCourse);
router.route("/get-course-bytype/:type").get(getByTypeCourse);
router.route("/courses/:category").get(getCoursesByCategory);
router.route("/notice").get(getNotice);
router.route("/search").get(searchCourses);
router.route("/free-class").get(getFreeCLass);
router.route("/get-blogs").get(getBlogs);
router.route("/blog/:id").get(getBlog);

//material
// router.route("/stream-material/:id").get(verifyJwt, streamMaterial);
router.route("/get-material-for-purchase/:id").get(getMaterialForPurchase);
router.route("/get-materials").get(getMaterials);

export default router;
