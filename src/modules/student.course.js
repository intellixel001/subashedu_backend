import { Course } from "../models/course.model.js";
import { EnrollCourse } from "../models/enrolledcourse.model.js";
import { Material } from "../models/Material.model.js";
import { Student } from "../models/student.model.js";

export const getMyEnrolledCourse = async (req, res) => {
  try {
    const studentId = req.student?._id;
    const courseId = req.params.id;

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // populate coursesEnrolled from Course model
    const myData = await Student.findById(studentId).lean();

    if (!myData) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // if no courseId param -> return all
    if (!courseId) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    // check and get the enrolled course object
    const enrolledCourse = myData.coursesEnrolled?.find(
      (course) => course.toString() === courseId
    );

    if (!enrolledCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found in student's enrolled courses",
      });
    }

    const enRolledCourseData = await EnrollCourse?.findOne({
      id: courseId,
      userid: myData?._id,
    });
    console.log({ enrollcourse: enRolledCourseData?.enrollcourse });

    return res.status(200).json({
      success: true,
      message: "Enrolled course fetched successfully",
      data: enRolledCourseData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching enrolled courses",
      error: error.message,
    });
  }
};

export const getMySinglematerial = async (req, res) => {
  try {
    const studentId = req.student?._id;
    const materialId = req.params.id;

    if (!studentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Find student
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // 1️⃣ Check if material purchased directly
    if (student.materials?.some((m) => m.toString() === materialId)) {
      const material = await Material.findById(materialId).lean();
      return res.status(200).json({
        success: true,
        message: "Material fetched successfully (direct purchase)",
        data: material,
        accessType: "direct-purchase",
      });
    }

    // 2️⃣ Check all enrolled courses
    const enrolledCourseDocs = await EnrollCourse.find({
      _id: { $in: student.coursesEnrolled },
      status: "approved",
    }).lean();

    // Get actual course IDs from enrolled courses
    const courseIds = enrolledCourseDocs.map((c) => c.id); // `id` is the real course ID
    const courses = await Course.find({ _id: { $in: courseIds } }).lean();

    // Check if material exists in any of the courses
    const materialFoundInCourse = courses.some(
      (course) =>
        Array.isArray(course.materials) &&
        course.materials.some((m) => m.toString() === materialId)
    );

    if (!materialFoundInCourse) {
      return res.status(403).json({
        success: false,
        message:
          "You have not purchased this material or any course containing it",
      });
    }

    // 3️⃣ Fetch material
    const material = await Material.findById(materialId).lean();
    if (!material) {
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Material fetched via purchased course",
      data: material,
      accessType: "course-purchase",
    });
  } catch (error) {
    console.error("getMySingleMaterial error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching material",
      error: error.message,
    });
  }
};
