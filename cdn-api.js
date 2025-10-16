const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = 4008;
const HOST = "127.0.0.1";
const UPLOAD_DIR = "/var/www/cdn";

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Helper: create date-based folders
function makeDateDir() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dir = path.join(UPLOAD_DIR, y.toString(), m, d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, makeDateDir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uid = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    cb(null, uid + ext);
  },
});

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
});

// Middleware
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("✅ CDN API is running"));

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, error: "No file uploaded" });

  const relPath = path.relative(UPLOAD_DIR, req.file.path).split(path.sep);
  const url = `https://cdn.adletica.com/files/${relPath.join("/")}`;

  res.json({
    success: true,
    url,
    filename: req.file.filename,
    size: req.file.size,
  });
});

// Serve files securely through Node
app.get("/files/:year/:month/:day/:filename", (req, res) => {
  const { year, month, day, filename } = req.params;
  const filePath = path.join(UPLOAD_DIR, year, month, day, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.sendFile(filePath);
});

// Error handler for uploads
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ success: false, error: "File too large (max 200MB)" });
  }
  return res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 CDN API running at http://${HOST}:${PORT}`);
});
// --------------------------------------------------------------------



const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = 4008;
const HOST = "127.0.0.1";
const UPLOAD_DIR = "/var/www/cdn";

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Helper: create date-based folders
function makeDateDir() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dir = path.join(UPLOAD_DIR, y.toString(), m, d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, makeDateDir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uid = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    cb(null, uid + ext);
  },
});

const MAX_SIZE = 200 * 1024 * 1024; // 200 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
});

// Middleware
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("✅ CDN API is running"));

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, error: "No file uploaded" });

  const relPath = path.relative(UPLOAD_DIR, req.file.path).split(path.sep);
  const url = `https://cdn.adletica.com/files/${relPath.join("/")}`;

  res.json({
    success: true,
    url,
    filename: req.file.filename,
    size: req.file.size,
  });
});

// Serve files securely through Node
app.use(
  "/files",
  express.static(UPLOAD_DIR, {
    acceptRanges: true,
    setHeaders: (res, path) => {
      if (path.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year
      }
    },
  })
);

// Error handler for uploads
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ success: false, error: "File too large (max 200MB)" });
  }
  return res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 CDN API running at http://${HOST}:${PORT}`);
});
