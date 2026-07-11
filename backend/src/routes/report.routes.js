const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  generateReport,
  getReports,
  getReport,
  downloadReport,
} = require("../controllers/report.controller");

router.post("/generate", authMiddleware, generateReport);

router.get("/", authMiddleware, getReports);

// IMPORTANT: this route must come BEFORE "/:id"
router.get("/download/:result_id", authMiddleware, downloadReport);

router.get("/:id", authMiddleware, getReport);

module.exports = router;