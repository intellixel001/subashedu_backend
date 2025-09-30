import { Class } from "../models/Class.model.js";
import { Course } from "../models/course.model.js";

// Create Class
export const createClass = async (req, res) => {
  try {
    const {
      title,
      subject,
      instructorId,
      courseId,
      courseType,
      billingType,
      type,
      videoLink,
      startTime,
      image,
    } = req.body;

 
    if (!title || !subject || !instructorId || !courseId || !type)
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });

    const course = await Course.findById(courseId);
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });

    const newClass = new Class({
      title,
      subject,
      instructorId: instructorId,
      courseId: course._id,
      billingType,
      type,
      courseType,
      videoLink: videoLink || "",
      startTime: startTime || null,
      image,
      isActiveLive: type === "live" ? false : null,
    });

    await newClass.save();
    res.status(201).json({ success: true, data: newClass });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};

// Update Class
export const updateClass = async (req, res) => {
  try {
    const {
      _id,
      title,
      subject,
      instructorId,
      courseId,
      courseType,
      billingType,
      type,
      image,
      videoLink,
      startTime,
    } = req.body;

    if (!_id)
      return res
        .status(400)
        .json({ success: false, message: "Class ID is required" });

    // Find the class first
    const cls = await Class.findById(_id);
    if (!cls)
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });

    // Update fields only if provided
    cls.title = title ?? cls.title;
    cls.subject = subject ?? cls.subject;
    cls.instructorId = instructorId ?? cls.instructorId;
    cls.billingType = billingType ?? cls.billingType;
    cls.type = type ?? cls.type;
    cls.image = image ?? cls.image;
    cls.courseType = courseType ?? cls.courseType;
    cls.videoLink = videoLink ?? cls.videoLink;
    cls.startTime = startTime ?? cls.startTime;

    // Update course info if courseId is provided
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course)
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });

      cls.course = course._id;
    }

    await cls.save();

    res.status(200).json({ success: true, data: cls });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};

// Get all classes
export const getClasses = async (req, res) => {
  try {
    const classes = await Class.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: classes });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};

// Delete Class
export const deleteClass = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id)
      return res
        .status(400)
        .json({ success: false, message: "Class ID required" });

    const cls = await Class.findByIdAndDelete(_id);
    if (!cls)
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });

    res
      .status(200)
      .json({ success: true, message: "Class deleted successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};

// Stop live class
export const stopLiveClass = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id)
      return res
        .status(400)
        .json({ success: false, message: "Class ID required" });

    const cls = await Class.findById(_id);
    if (!cls)
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });

    cls.isActiveLive = false;
    await cls.save();
    res
      .status(200)
      .json({ success: true, message: "Live class stopped", data: cls });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};
