import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createLessonController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, type, requiredForNext, contents } = req.body;

  // check course
  const course = await Course.findById(id);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found",
    });
  }

  // create new lesson object
  const newLesson = {
    name,
    description,
    type,
    requiredForNext: requiredForNext || false,
    contents: contents || [],
  };

  // push lesson into course
  course.lessons.push(newLesson);

  // save updated course
  await course.save();

  return res.status(201).json({
    success: true,
    message: "Lesson added successfully",
    data: course.lessons[course.lessons.length - 1], // return only the newly added lesson
  });
});

export const addContentController = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;
  const { name, type, link, description, requiredForNext } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(lessonId)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid course or lesson ID" });
  }

  // Use updateOne with positional operator $
  const result = await Course.updateOne(
    { _id: courseId, "lessons._id": lessonId },
    {
      $push: {
        "lessons.$.contents": {
          name,
          type,
          link,
          description,
          requiredForNext,
        },
      },
    }
  );

  if (result.modifiedCount === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Course or lesson not found" });
  }

  return res.status(201).json({
    success: true,
    message: "Content added successfully",
  });
});

// Update content
export const updateContentController = asyncHandler(async (req, res) => {
  const { courseId, lessonId, contentId } = req.params;
  const updateData = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(lessonId) ||
    !mongoose.Types.ObjectId.isValid(contentId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid IDs" });
  }

  const course = await Course.findById(courseId);
  if (!course)
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });

  const lesson = course.lessons.id(lessonId);
  if (!lesson)
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });

  const content = lesson.contents.id(contentId);
  if (!content)
    return res
      .status(404)
      .json({ success: false, message: "Content not found" });

  content.set(updateData);
  await course.save();

  res.json({
    success: true,
    message: "Content updated successfully",
    data: content,
  });
});

// Delete content using updateOne and $pull
export const deleteContentController = asyncHandler(async (req, res) => {
  const { courseId, lessonId, contentId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(lessonId) ||
    !mongoose.Types.ObjectId.isValid(contentId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid IDs" });
  }

  const result = await Course.updateOne(
    { _id: courseId, "lessons._id": lessonId },
    { $pull: { "lessons.$.contents": { _id: contentId } } }
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json({
      success: false,
      message: "Course, lesson, or content not found",
    });
  }

  res.json({ success: true, message: "Content deleted successfully" });
});

// Delete lesson using updateOne and $pull
export const deleteLessonController = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(lessonId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid IDs" });
  }

  const result = await Course.updateOne(
    { _id: courseId },
    { $pull: { lessons: { _id: lessonId } } }
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json({
      success: false,
      message: "Course or lesson not found",
    });
  }

  res.json({ success: true, message: "Lesson deleted successfully" });
});

// --- Update a lesson using updateOne ---
export const updateLessonController = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;
  const updateData = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !mongoose.Types.ObjectId.isValid(lessonId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid IDs" });
  }

  const result = await Course.updateOne(
    { _id: courseId, "lessons._id": lessonId },
    {
      $set: Object.fromEntries(
        Object.entries(updateData).map(([key, value]) => [
          `lessons.$.${key}`,
          value,
        ])
      ),
    }
  );

  if (result.modifiedCount === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Course or lesson not found" });
  }

  res.json({ success: true, message: "Lesson updated successfully" });
});
