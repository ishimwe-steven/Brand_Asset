const express = require("express");
const router = express.Router();

const upload = require("../config/multer");
const authMiddleware = require("../middleware/auth.middleware");

const {
  uploadPackaging,
  getUploads,
  getUpload,
  deleteUpload,
} = require("../controllers/upload.controller");

router.post("/", authMiddleware, upload.single("packaging"), uploadPackaging);
router.get("/", authMiddleware, getUploads);
router.get("/:id", authMiddleware, getUpload);
router.delete("/:id", authMiddleware, deleteUpload);
const { extractTextFromImage } = require("../services/ocr.service");

router.get("/:id/ocr-test", authMiddleware, async (req, res) => {
  const Upload = require("../models/upload.model");
  const uploadRecord = await Upload.getById(req.params.id);

  if (!uploadRecord) {
    return res.status(404).json({ success: false, message: "Upload not found" });
  }

  const result = await extractTextFromImage(uploadRecord.file_path);

  res.json({
    success: true,
    file: uploadRecord.file_path,
    ocr: result,
  });
});
module.exports = router;