const express = require("express");
const router = express.Router();

const {
  getMarkets,
  getMarket,
  createMarket,
  updateMarket,
  deleteMarket,
} = require("../controllers/market.controller");

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

router.get("/", getMarkets);
router.get("/:id", getMarket);

router.post("/", authMiddleware, adminMiddleware, createMarket);
router.put("/:id", authMiddleware, adminMiddleware, updateMarket);
router.delete("/:id", authMiddleware, adminMiddleware, deleteMarket);

module.exports = router;