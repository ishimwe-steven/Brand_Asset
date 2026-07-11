const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  startVerification,
  getVerification,
  getHistory,
} = require("../controllers/verification.controller");

router.post("/start", authMiddleware, startVerification);
router.get("/history", authMiddleware, getHistory);
router.get("/:id", authMiddleware, getVerification);

module.exports = router;