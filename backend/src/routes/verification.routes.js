const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  startVerification,
  getVerification,
  getHistory,
} = require("../controllers/verification.controller");

// Start packaging verification
router.post(
  "/start",
  authMiddleware,
  startVerification
);

// Verification history
router.get(
  "/history",
  authMiddleware,
  getHistory
);

// Get one verification by ID
router.get(
  "/:id",
  authMiddleware,
  getVerification
);

module.exports = router;