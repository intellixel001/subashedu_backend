import { Router } from "express";
import {
  getAllCourse,
  getBlog,
  getBlogs,
  getCourse,
  getCoursesByCategory,
  getFreeClasses,
  getHomePageData,
  getMaterialForPurchase,
  getMaterials,
  getNotice,
  homeController,
  searchCourses,
  streamMaterial,
} from "../controllers/home.controller.js";
import { verifyJwt } from "./../middlewares/verifyJwt.js";

const router = Router();

router.route("").get(homeController);
router.route("/get-homepage-data").get(getHomePageData);
router.route("/course/:id").get(getCourse);
router.route("/get-all-course").get(getAllCourse);
router.route("/courses/:category").get(getCoursesByCategory);
router.route("/notice").get(getNotice);
router.route("/free-classes").get(getFreeClasses);
router.route("/search").get(searchCourses);
router.route("/get-blogs").get(getBlogs);
router.route("/blog/:id").get(getBlog);

//material
router.route("/stream-material/:id").get(verifyJwt, streamMaterial);
router.route("/get-material-for-purchase/:id").get(getMaterialForPurchase);
router.route("/get-materials").get(getMaterials);

export default router;
