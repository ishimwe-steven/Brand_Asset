const express = require("express");
const router = express.Router();

const {
  getRegulations,
  getRegulation,
  createRegulation,
  updateRegulation,
  deleteRegulation,
} = require("../controllers/regulation.controller");

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

router.get("/", getRegulations);
router.get("/:id", getRegulation);

router.post("/", authMiddleware, adminMiddleware, createRegulation);
router.put("/:id", authMiddleware, adminMiddleware, updateRegulation);
router.delete("/:id", authMiddleware, adminMiddleware, deleteRegulation);

module.exports = router;