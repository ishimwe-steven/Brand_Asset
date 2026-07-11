const express = require("express");
const router = express.Router();

const upload = require("../config/multer");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const {
  createReference,
  getReferences,
  getReference,
  deleteReference,
} = require("../controllers/reference.controller");

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  upload.single("reference"),
  createReference
);

router.get("/", authMiddleware, getReferences);
router.get("/:id", authMiddleware, getReference);
router.delete("/:id", authMiddleware, adminMiddleware, deleteReference);

module.exports = router;