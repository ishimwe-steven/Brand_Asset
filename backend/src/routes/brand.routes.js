const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const {
  uploadBrandLogo,
} = require("../config/multer");

const {
  createBrand,
  getCompanyBrands,
  getAvailableBrands,
  getBrandById,
  updateBrand,
  changeBrandStatus,
} = require("../controllers/brand.controller");

router.post(
  "/",
  auth,
  uploadBrandLogo.single("official_logo"),
  createBrand
);

router.get(
  "/my-brands",
  auth,
  getCompanyBrands
);

router.get(
  "/available",
  auth,
  getAvailableBrands
);

router.get(
  "/:id",
  auth,
  getBrandById
);

router.put(
  "/:id",
  auth,
  uploadBrandLogo.single("official_logo"),
  updateBrand
);

router.patch(
  "/:id/status",
  auth,
  changeBrandStatus
);

module.exports = router;