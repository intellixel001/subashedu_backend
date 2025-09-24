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

    // find student
    const myData = await Student.findById(studentId).lean();
    if (!myData) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // check enrollment
    const enrolledCourseId = myData.coursesEnrolled?.find(
      (c) => c.toString() === courseId
    );
    if (!enrolledCourseId) {
      return res.status(404).json({
        success: false,
        message: "Course not found in student's enrolled courses",
      });
    }

    // fetch enrolled + main course
    const enrolledCourseData = await EnrollCourse.findOne({
      id: courseId,
      userid: myData._id,
    });
    const mainCourse = await Course.findById(courseId).lean();

    if (!enrolledCourseData || !mainCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let updated = false;

    // ---------- SYNC LESSONS ----------
    const mainLessons = mainCourse.lessons || [];
    const enrolledLessons = enrolledCourseData.enrollcourse || [];

    // convert enrolled lessons to map for quick lookup
    const enrolledMap = new Map(
      enrolledLessons.map((l) => [l._id.toString(), l])
    );

    const syncedLessons = mainLessons.map((lesson) => {
      const existing = enrolledMap.get(lesson._id.toString());

      if (existing) {
        // update basic fields
        existing.name = lesson.name;
        existing.description = lesson.description;
        existing.type = lesson.type;
        existing.requiredForNext = lesson.requiredForNext;

        // ---------- SYNC CONTENTS ----------
        const enrolledContents = existing.contents || [];
        const contentMap = new Map(
          enrolledContents.map((c) => [c._id.toString(), c])
        );

        existing.contents = lesson.contents.map((content) => {
          const existContent = contentMap.get(content._id.toString());
          if (existContent) {
            // update existing content
            existContent.name = content.name;
            existContent.type = content.type;
            existContent.link = content.link;
            existContent.requiredForNext = content.requiredForNext;
            existContent.description = content.description;
            return existContent;
          } else {
            // new content → add fresh with default progress
            return {
              ...content,
              status: "locked", // you can track status per content too
            };
          }
        });

        updated = true;
        return existing;
      } else {
        // new lesson → add fresh
        updated = true;
        return {
          ...lesson,
          status: "locked",
          contents: lesson.contents.map((c) => ({
            ...c,
            status: "locked",
          })),
        };
      }
    });

    // overwrite lessons
    enrolledCourseData.enrollcourse = syncedLessons;

    // ---------- SYNC MATERIALS ----------
    const enrolledMaterials =
      enrolledCourseData.materials?.map((m) => m.toString()) || [];
    const mainMaterials = mainCourse.materials?.map((m) => m.toString()) || [];

    // replace with fresh materials (or merge if you want)
    if (JSON.stringify(enrolledMaterials) !== JSON.stringify(mainMaterials)) {
      enrolledCourseData.materials = mainCourse.materials;
      updated = true;
    }

    // ---------- SAVE IF UPDATED ----------
    // ---------- SAVE IF UPDATED ----------
    if (updated) {
      await EnrollCourse.updateOne(
        { _id: enrolledCourseData._id },
        {
          $set: {
            enrollcourse: syncedLessons,
            materials: mainCourse.materials,
          },
        }
      );

      // also reflect the changes in response (without another query)
      enrolledCourseData.enrollcourse = syncedLessons;
      enrolledCourseData.materials = mainCourse.materials;
    }

    return res.status(200).json({
      success: true,
      message: "Enrolled course synced successfully",
      data: enrolledCourseData,
      synced: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching enrolled course",
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

// --- Get Single Course Content ---
export const getCourseContent = async (req, res) => {
  try {
    const { courseId, lessonId, contentId } = req.query;
    const studentId = req.student?._id;

    if (!studentId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!courseId || !lessonId || !contentId)
      return res.status(400).json({
        success: false,
        message: "Missing courseId, lessonId or contentId",
      });

    // Find the enrolled course for this student
    const enrolled = await EnrollCourse.findOne({
      id: courseId,
      userid: studentId,
    }).lean();

    if (!enrolled) {
      return res
        .status(404)
        .json({ success: false, message: "Course not enrolled" });
    }

    // Find the lesson
    const lesson = enrolled.enrollcourse.find(
      (l) => l._id.toString() === lessonId
    );
    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found" });
    }

    // Find the content
    const content = lesson.contents.find((c) => c._id.toString() === contentId);
    if (!content) {
      return res
        .status(404)
        .json({ success: false, message: "Content not found" });
    }

    return res.status(200).json({
      success: true,
      data: content,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching content",
      error: err.message,
    });
  }
};
