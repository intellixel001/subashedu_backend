import { Class } from "../models/Class.model.js";
import { Course } from "../models/course.model.js";

import crypto from "crypto";

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

    // If type is live, generate random stream key
    let streamKey = videoLink || "";
    if (type === "live") {
      streamKey = crypto.randomBytes(8).toString("hex"); // 16 chars random key
    }

    const newClass = new Class({
      title,
      subject,
      instructorId,
      courseId: course._id,
      billingType,
      type,
      courseType,
      videoLink: streamKey,
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

// Update Class using updateOne
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

    // Prepare update object
    const updateData = {
      ...(title && { title }),
      ...(subject && { subject }),
      ...(instructorId && { instructorId }),
      ...(billingType && { billingType }),
      ...(type && { type }),
      ...(image && { image }),
      ...(courseType && { courseType }),
      ...(startTime && { startTime }),
    };

    // If live class and no videoLink provided, generate random key
    if (type === "live") {
      updateData.videoLink = crypto.randomBytes(8).toString("hex");
    } else if (videoLink) {
      updateData.videoLink = videoLink;
    }

    // If courseId provided, validate and set
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course)
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      updateData.courseId = course._id;
    }

    const result = await Class.updateOne({ _id }, { $set: updateData });

    if (result.matchedCount === 0)
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });

    // Fetch updated class
    const updatedClass = await Class.findById(_id);

    res.status(200).json({ success: true, data: updatedClass });
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

// Get single class by ID
export const getClassById = async (req, res) => {
  try {
    const { id } = req.params; // use req.params for RESTful route like /api/class/:id
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Class ID is required" });

    const cls = await Class.findById(id);
    if (!cls)
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });

    res.status(200).json({
      success: true,
      liveClass: cls,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};

//   GNU nano 6.2                                                                                                                                                                                                                                                                                                                                                                                                                                                                         /etc/nginx/nginx.conf
// user www-data;
// worker_processes auto;
// worker_cpu_affinity auto;
// pid /run/nginx.pid;
// error_log /var/log/nginx/error.log;
// include /etc/nginx/modules-enabled/*.conf;

// events {
//         worker_connections 768;
//         # multi_accept on;
// }

// rtmp {
//     server {
//         listen 1935;                  # RTMP port
//         chunk_size 4096;

//         application live {
//             live on;
//             record off;

//             # HLS settings
//             hls on;
//             hls_path /tmp/hls;
//             hls_fragment 2s;
//             hls_playlist_length 10s;

//             allow publish all;         # allow streaming from OBS
//             allow play all;
//         }
//     }
// }

// http {

//         ##
//         # Basic Settings
//         ##

//         sendfile on;
//         tcp_nopush on;
//         types_hash_max_size 2048;
//         server_tokens build; # Recommended practice is to turn this off

//         # server_names_hash_bucket_size 64;
//         # server_name_in_redirect off;

//         include /etc/nginx/mime.types;
//         default_type application/octet-stream;

//         ##
//         # SSL Settings
//         ##

//         ssl_protocols TLSv1.2 TLSv1.3; # Dropping SSLv3 (POODLE), TLS 1.0, 1.1
//         ssl_prefer_server_ciphers off; # Don't force server cipher order.

//         ##
//         # Logging Settings
//         ##

//         access_log /var/log/nginx/access.log;

//         ##
//         # Gzip Settings
//         ##

//         gzip on;

//         # gzip_vary on;
//         # gzip_proxied any;
//         # gzip_comp_level 6;
//         # gzip_buffers 16 8k;
//         # gzip_http_version 1.1;
//         # gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

//         ##
//         # Virtual Host Configs
//         ##

//         include /etc/nginx/conf.d/*.conf;
//         include /etc/nginx/sites-enabled/*;

//         server {
//     listen 80;
//     server_name stream.intelixel.com;

//     location / {
//         root /usr/share/nginx/html;
//     }

//     location /hls {
//         types {
//             application/vnd.apple.mpegurl m3u8;
//             video/mp2t ts;
//         }
//         root /tmp;
//         add_header Cache-Control no-cache;
//     }
// }

// }

// #mail {
// #       # See sample authentication script at:
// #       # http://wiki.nginx.org/ImapAuthenticateWithApachePhpScript
// #
// #       # auth_http localhost/auth.php;
// #       # pop3_capabilities "TOP" "USER";
// #       # imap_capabilities "IMAP4rev1" "UIDPLUS";
// #
// #       server {
// #               listen     localhost:110;
// #               protocol   pop3;
// #               proxy      on;
// #       }
// #
// #       server {
// #               listen     localhost:143;
// #               protocol   imap;
// #               proxy      on;
// #       }
// #}
