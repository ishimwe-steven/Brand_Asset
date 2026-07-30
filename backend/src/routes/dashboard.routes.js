const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");
const {
  getDashboardStats,
  getAdminDashboardAnalytics,
} = require("../controllers/dashboard.controller");

const router = express.Router();
router.get("/stats", authMiddleware, getDashboardStats);
router.get(
  "/admin-analytics",
  authMiddleware,
  adminMiddleware,
  getAdminDashboardAnalytics
);

module.exports = router;
