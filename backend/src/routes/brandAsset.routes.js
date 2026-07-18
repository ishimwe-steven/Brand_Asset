const express = require("express");
const router = express.Router();

const upload = require("../config/multer");
const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  verifyLogoQuality,
  verifyLogoPlacement,
  detectAndVerifyLogoPlacement,
  detectAndVerifyBrandColours,
  getBrandAssetChecks,
} = require("../controllers/brandAsset.controller");

router.post(
  "/logo-quality/:uploadId",
  authMiddleware,
  verifyLogoQuality
);

router.post(
  "/logo-placement/:uploadId",
  authMiddleware,
  verifyLogoPlacement
);

router.post(
  "/auto-logo-placement/:uploadId",
  authMiddleware,
  upload.single("reference_logo"),
  detectAndVerifyLogoPlacement
);

router.post(
  "/auto-brand-colours/:uploadId",
  authMiddleware,
  upload.single("official_logo"),
  detectAndVerifyBrandColours
);

router.get(
  "/upload/:uploadId",
  authMiddleware,
  getBrandAssetChecks
);

module.exports = router;