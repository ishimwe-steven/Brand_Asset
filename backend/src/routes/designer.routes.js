const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const {
  createDesigner,
  getMyDesigners,
  getDesignerById,
  updateDesigner,
  changeDesignerStatus,
  resetDesignerPassword,
} = require("../controllers/designer.controller");

// SME creates a designer account
router.post(
  "/",
  auth,
  createDesigner
);

// SME gets all designers belonging to its company
router.get(
  "/my-designers",
  auth,
  getMyDesigners
);

// SME gets one designer
router.get(
  "/:id",
  auth,
  getDesignerById
);

// SME updates designer name or email
router.put(
  "/:id",
  auth,
  updateDesigner
);

// SME activates or disables designer
router.patch(
  "/:id/status",
  auth,
  changeDesignerStatus
);

// SME generates a new temporary password
router.patch(
  "/:id/reset-password",
  auth,
  resetDesignerPassword
);

module.exports = router;     