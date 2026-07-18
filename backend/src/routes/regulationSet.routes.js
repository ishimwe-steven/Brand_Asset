const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getRegulationSets,
  getRegulationSetById,
  createRegulationSet,
  updateRegulationSetStatus,
  deleteRegulationSet,
  getActiveRegulationSet,
  getRegulationSetStatistics,
  reprocessRegulationSet,
} = require("../controllers/regulationSet.controller");

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const adminMiddleware = require(
  "../middleware/admin.middleware"
);

const router = express.Router();

// =========================================================
// UPLOAD DIRECTORY
// =========================================================
const uploadDirectory = path.join(
  process.cwd(),
  "src",
  "uploads",
  "regulations"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// =========================================================
// MULTER STORAGE
// =========================================================
const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const originalNameWithoutExtension = path.basename(
      file.originalname,
      extension
    );

    const cleanFileName =
      originalNameWithoutExtension
        .trim()
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") ||
      "regulation-document";

    const uniqueFileName = `${Date.now()}-${cleanFileName}${extension}`;

    callback(null, uniqueFileName);
  },
});

// =========================================================
// FILE VALIDATION
// =========================================================
const fileFilter = (_req, file, callback) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
  ];

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const validMimeType = allowedMimeTypes.includes(
    file.mimetype
  );

  const validExtension =
    allowedExtensions.includes(extension);

  if (validMimeType && validExtension) {
    return callback(null, true);
  }

  return callback(
    new Error(
      "Only PDF, DOC and DOCX regulation documents are allowed."
    )
  );
};

// =========================================================
// MULTER CONFIGURATION
// =========================================================
const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

// =========================================================
// MULTER ERROR HANDLER
// Frontend file field name must be: document
// =========================================================
const uploadRegulationDocument = (
  req,
  res,
  next
) => {
  upload.single("document")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message:
            "Regulation document size must not exceed 15 MB.",
        });
      }

      if (error.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message:
            'Unexpected file field. The file field name must be "document".',
        });
      }

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to upload regulation document.",
      });
    }

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Invalid regulation document.",
    });
  });
};

// =========================================================
// GET REGULATION SET STATISTICS
// Keep this route before /:id
// GET /api/regulation-sets/statistics
// Admin only
// =========================================================
router.get(
  "/statistics",
  authMiddleware,
  adminMiddleware,
  getRegulationSetStatistics
);

// =========================================================
// GET ACTIVE REGULATION SET FOR VERIFICATION
// Keep this route before /:id
// GET /api/regulation-sets/active/:marketId/:categoryId
// Authenticated users
// =========================================================
router.get(
  "/active/:marketId/:categoryId",
  authMiddleware,
  getActiveRegulationSet
);

// =========================================================
// GET ALL REGULATION SETS
// GET /api/regulation-sets
// Admin only
// =========================================================
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  getRegulationSets
);

// =========================================================
// GET ONE REGULATION SET
// GET /api/regulation-sets/:id
// Admin only
// =========================================================
router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  getRegulationSetById
);

router.post(
  "/:id/reprocess",
  authMiddleware,
  adminMiddleware,
  reprocessRegulationSet
);

// =========================================================
// CREATE REGULATION SET
// POST /api/regulation-sets
// Admin only
// Content-Type: multipart/form-data
// File field name: document
// =========================================================
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  uploadRegulationDocument,
  createRegulationSet
);

// =========================================================
// UPDATE REGULATION SET STATUS
// PATCH /api/regulation-sets/:id/status
// Admin only
// Body: { "status": "active" | "inactive" }
// =========================================================
router.patch(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  updateRegulationSetStatus
);

// =========================================================
// DELETE REGULATION SET
// DELETE /api/regulation-sets/:id
// Admin only
// =========================================================
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deleteRegulationSet
);

module.exports = router;
