const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

const router = express.Router();

const uploadsDir = path.join(process.cwd(), "uploads", "stations");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext && ext.length <= 10 ? ext : "";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

/**
 * Upload station photos.
 *
 * multipart/form-data
 * field: photos (multiple)
 */
router.post("/stations/photos", authenticateToken, requireAdmin, upload.array("photos", 12), async (req, res) => {
  const files = req.files || [];
  const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const urls = files.map((f) => `${baseUrl}/uploads/stations/${encodeURIComponent(f.filename)}`);
  res.json({ urls });
});

module.exports = router;
