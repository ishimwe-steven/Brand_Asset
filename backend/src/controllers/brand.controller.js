const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

const Brand = require("../models/brand.model");
const Company = require("../models/company.model");
const Designer = require("../models/designer.model");

const {
  success,
  error,
} = require("../utils/response");

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  "http://127.0.0.1:8000";

// =========================
// Helpers
// =========================

const normalizeJsonField = (
  value,
  fallback = null
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const deleteFileSafely = (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (cleanupError) {
    console.error(
      "BRAND LOGO CLEANUP ERROR:",
      cleanupError.message
    );
  }
};

const normalizeUploadedPath = (filePath) => {
  return String(filePath)
    .replace(/\\/g, "/")
    .replace(/^.*?uploads\//, "uploads/");
};

const getAuthenticatedUserId = (req) => {
  const userId = Number(req.user?.id);

  if (!userId || Number.isNaN(userId)) {
    return null;
  }

  return userId;
};

const getActiveCompanyForUser = async (
  userId
) => {
  const company =
    await Company.getByOwnerUserId(userId);

  if (!company) {
    return {
      company: null,
      message:
        "No company account is associated with this user",
      statusCode: 404,
    };
  }

  if (company.status !== "active") {
    return {
      company: null,
      message:
        "Your company account is inactive",
      statusCode: 403,
    };
  }

  return {
    company,
    message: null,
    statusCode: null,
  };
};

const ensureBrandBelongsToCompany = (
  brand,
  companyId
) => {
  if (!brand) {
    return {
      valid: false,
      message: "Brand not found",
      statusCode: 404,
    };
  }

  if (
    Number(brand.company_id) !==
    Number(companyId)
  ) {
    return {
      valid: false,
      message:
        "You are not allowed to access this brand",
      statusCode: 403,
    };
  }

  return {
    valid: true,
    message: null,
    statusCode: null,
  };
};

// =========================
// Create Brand
// =========================

exports.createBrand = async (
  req,
  res
) => {
  let uploadedLogoPath = null;

  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForUser(userId);

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const companyId =
      companyResult.company.id;

    const brandName = String(
      req.body.brand_name || ""
    ).trim();

    const slogan =
      String(
        req.body.slogan || ""
      ).trim() || null;

    const trademark =
      String(
        req.body.trademark || ""
      ).trim() || null;

    const preferredLogoPositions =
      normalizeJsonField(
        req.body.preferred_logo_positions,
        [
          "top_left",
          "top_center",
        ]
      );

    const minimumLogoAreaPercent =
      Number(
        req.body
          .minimum_logo_area_percent ??
          2
      );

    const maximumLogoAreaPercent =
      Number(
        req.body
          .maximum_logo_area_percent ??
          15
      );

    if (!brandName) {
      return error(
        res,
        "Brand name is required",
        400
      );
    }

    if (!req.file) {
      return error(
        res,
        "Official logo is required",
        400
      );
    }

    if (
      Number.isNaN(
        minimumLogoAreaPercent
      ) ||
      minimumLogoAreaPercent <= 0
    ) {
      return error(
        res,
        "Minimum logo area percent must be greater than zero",
        400
      );
    }

    if (
      Number.isNaN(
        maximumLogoAreaPercent
      ) ||
      maximumLogoAreaPercent <=
        minimumLogoAreaPercent
    ) {
      return error(
        res,
        "Maximum logo area percent must be greater than minimum logo area percent",
        400
      );
    }

    uploadedLogoPath =
      req.file.path;

    if (
      !fs.existsSync(
        uploadedLogoPath
      )
    ) {
      return error(
        res,
        "Uploaded official logo was not found on the server",
        404
      );
    }

    const existingBrand =
      await Brand.getByCompanyAndName(
        companyId,
        brandName
      );

    if (existingBrand) {
      deleteFileSafely(
        uploadedLogoPath
      );

      return error(
        res,
        "A brand with this name already exists in your company",
        409
      );
    }

    const formData =
      new FormData();

    formData.append(
      "official_logo",
      fs.createReadStream(
        uploadedLogoPath
      ),
      {
        filename: path.basename(
          uploadedLogoPath
        ),
      }
    );

    const aiResponse =
      await axios.post(
        `${AI_SERVICE_URL}/extract-brand-profile`,
        formData,
        {
          headers:
            formData.getHeaders(),
          maxBodyLength: Infinity,
          timeout: 120000,
        }
      );

    const brandProfile =
      aiResponse.data?.data;

    if (
      !brandProfile?.success
    ) {
      deleteFileSafely(
        uploadedLogoPath
      );

      return error(
        res,
        "AI service failed to extract the brand profile",
        400,
        aiResponse.data
      );
    }

    const normalizedLogoPath =
      normalizeUploadedPath(
        uploadedLogoPath
      );

    const brandId =
      await Brand.create({
        company_id: companyId,
        brand_name: brandName,
        official_logo_path:
          normalizedLogoPath,
        dominant_colours:
          brandProfile
            .dominant_colours ||
          [],
        primary_colour:
          brandProfile
            .primary_colour ||
          null,
        secondary_colour:
          brandProfile
            .secondary_colour ||
          null,
        logo_metadata:
          brandProfile
            .logo_metadata ||
          {},
        slogan,
        trademark,
        preferred_logo_positions:
          preferredLogoPositions,
        minimum_logo_area_percent:
          minimumLogoAreaPercent,
        maximum_logo_area_percent:
          maximumLogoAreaPercent,
        created_by: userId,
      });

    const createdBrand =
      await Brand.getById(
        brandId
      );

    return success(
      res,
      "Brand created successfully",
      {
        brand: createdBrand,
        extracted_profile:
          brandProfile,
      },
      201
    );
  } catch (err) {
    console.error(
      "CREATE BRAND ERROR:",
      err.response?.data ||
        err.message
    );

    deleteFileSafely(
      uploadedLogoPath
    );

    if (
      err.code ===
      "ECONNREFUSED"
    ) {
      return error(
        res,
        "AI service is not running on port 8000",
        503
      );
    }

    return error(
      res,
      "Failed to create brand",
      500,
      err.response?.data ||
        err.message
    );
  }
};

// =========================
// Get Logged-in SME Brands
// =========================

exports.getCompanyBrands = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForUser(userId);

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const brands =
      await Brand.getByCompany(
        companyResult.company.id
      );

    return success(
      res,
      "Company brands fetched successfully",
      brands
    );
  } catch (err) {
    console.error(
      "GET COMPANY BRANDS ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to fetch company brands",
      500,
      err.message
    );
  }
};

// =========================
// Get Brand by ID
// =========================

exports.getBrandById = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForUser(userId);

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const brandId = Number(
      req.params.id
    );

    if (
      !brandId ||
      Number.isNaN(brandId)
    ) {
      return error(
        res,
        "Valid brand ID is required",
        400
      );
    }

    const brand =
      await Brand.getById(
        brandId
      );

    const ownership =
      ensureBrandBelongsToCompany(
        brand,
        companyResult.company.id
      );

    if (!ownership.valid) {
      return error(
        res,
        ownership.message,
        ownership.statusCode
      );
    }

    return success(
      res,
      "Brand fetched successfully",
      brand
    );
  } catch (err) {
    console.error(
      "GET BRAND ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to fetch brand",
      500,
      err.message
    );
  }
};

// =========================
// Update Brand
// =========================

exports.updateBrand = async (
  req,
  res
) => {
  let newLogoPath = null;

  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForUser(userId);

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const brandId = Number(
      req.params.id
    );

    if (
      !brandId ||
      Number.isNaN(brandId)
    ) {
      return error(
        res,
        "Valid brand ID is required",
        400
      );
    }

    const existingBrand =
      await Brand.getById(
        brandId
      );

    const ownership =
      ensureBrandBelongsToCompany(
        existingBrand,
        companyResult.company.id
      );

    if (!ownership.valid) {
      return error(
        res,
        ownership.message,
        ownership.statusCode
      );
    }

    const updateData = {
      brand_name:
        req.body.brand_name !==
        undefined
          ? String(
              req.body.brand_name
            ).trim()
          : existingBrand.brand_name,

      slogan:
        req.body.slogan !==
        undefined
          ? String(
              req.body.slogan ||
                ""
            ).trim() || null
          : existingBrand.slogan,

      trademark:
        req.body.trademark !==
        undefined
          ? String(
              req.body.trademark ||
                ""
            ).trim() || null
          : existingBrand.trademark,

      preferred_logo_positions:
        req.body
          .preferred_logo_positions !==
        undefined
          ? normalizeJsonField(
              req.body
                .preferred_logo_positions,
              existingBrand
                .preferred_logo_positions
            )
          : existingBrand
              .preferred_logo_positions,

      minimum_logo_area_percent:
        req.body
          .minimum_logo_area_percent !==
        undefined
          ? Number(
              req.body
                .minimum_logo_area_percent
            )
          : Number(
              existingBrand
                .minimum_logo_area_percent
            ),

      maximum_logo_area_percent:
        req.body
          .maximum_logo_area_percent !==
        undefined
          ? Number(
              req.body
                .maximum_logo_area_percent
            )
          : Number(
              existingBrand
                .maximum_logo_area_percent
            ),

      official_logo_path:
        existingBrand
          .official_logo_path,

      dominant_colours:
        existingBrand
          .dominant_colours,

      primary_colour:
        existingBrand
          .primary_colour,

      secondary_colour:
        existingBrand
          .secondary_colour,

      logo_metadata:
        existingBrand
          .logo_metadata,
    };

    if (
      !updateData.brand_name
    ) {
      return error(
        res,
        "Brand name cannot be empty",
        400
      );
    }

    if (
      Number.isNaN(
        updateData
          .minimum_logo_area_percent
      ) ||
      Number.isNaN(
        updateData
          .maximum_logo_area_percent
      ) ||
      updateData
        .minimum_logo_area_percent <=
        0 ||
      updateData
        .maximum_logo_area_percent <=
        updateData
          .minimum_logo_area_percent
    ) {
      return error(
        res,
        "Logo area percentage values are invalid",
        400
      );
    }

    const duplicateBrand =
      await Brand.getByCompanyAndName(
        companyResult.company.id,
        updateData.brand_name
      );

    if (
      duplicateBrand &&
      Number(
        duplicateBrand.id
      ) !== brandId
    ) {
      return error(
        res,
        "Another brand with this name already exists in your company",
        409
      );
    }

    if (req.file) {
      newLogoPath =
        req.file.path;

      if (
        !fs.existsSync(
          newLogoPath
        )
      ) {
        return error(
          res,
          "Uploaded new logo was not found",
          404
        );
      }

      const formData =
        new FormData();

      formData.append(
        "official_logo",
        fs.createReadStream(
          newLogoPath
        ),
        {
          filename:
            path.basename(
              newLogoPath
            ),
        }
      );

      const aiResponse =
        await axios.post(
          `${AI_SERVICE_URL}/extract-brand-profile`,
          formData,
          {
            headers:
              formData.getHeaders(),
            maxBodyLength:
              Infinity,
            timeout: 120000,
          }
        );

      const brandProfile =
        aiResponse.data?.data;

      if (
        !brandProfile?.success
      ) {
        deleteFileSafely(
          newLogoPath
        );

        return error(
          res,
          "Failed to extract the new official logo profile",
          400
        );
      }

      updateData.official_logo_path =
        normalizeUploadedPath(
          newLogoPath
        );

      updateData.dominant_colours =
        brandProfile
          .dominant_colours ||
        [];

      updateData.primary_colour =
        brandProfile
          .primary_colour ||
        null;

      updateData.secondary_colour =
        brandProfile
          .secondary_colour ||
        null;

      updateData.logo_metadata =
        brandProfile
          .logo_metadata ||
        {};
    }

    await Brand.update(
      brandId,
      updateData
    );

    if (
      req.file &&
      existingBrand
        .official_logo_path &&
      existingBrand
        .official_logo_path !==
        updateData
          .official_logo_path
    ) {
      const oldLogoAbsolutePath =
        path.resolve(
          __dirname,
          "..",
          existingBrand
            .official_logo_path
        );

      deleteFileSafely(
        oldLogoAbsolutePath
      );
    }

    const updatedBrand =
      await Brand.getById(
        brandId
      );

    return success(
      res,
      "Brand updated successfully",
      updatedBrand
    );
  } catch (err) {
    console.error(
      "UPDATE BRAND ERROR:",
      err.response?.data ||
        err.message
    );

    deleteFileSafely(
      newLogoPath
    );

    if (
      err.code ===
      "ECONNREFUSED"
    ) {
      return error(
        res,
        "AI service is not running on port 8000",
        503
      );
    }

    return error(
      res,
      "Failed to update brand",
      500,
      err.response?.data ||
        err.message
    );
  }
};

// =========================
// Activate / Deactivate Brand
// =========================

exports.changeBrandStatus = async (
  req,
  res
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    if (!userId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForUser(userId);

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const brandId = Number(
      req.params.id
    );

    const status = String(
      req.body.status || ""
    )
      .trim()
      .toLowerCase();

    if (
      !brandId ||
      Number.isNaN(brandId)
    ) {
      return error(
        res,
        "Valid brand ID is required",
        400
      );
    }

    if (
      ![
        "active",
        "inactive",
      ].includes(status)
    ) {
      return error(
        res,
        "Status must be active or inactive",
        400
      );
    }

    const brand =
      await Brand.getById(
        brandId
      );

    const ownership =
      ensureBrandBelongsToCompany(
        brand,
        companyResult.company.id
      );

    if (!ownership.valid) {
      return error(
        res,
        ownership.message,
        ownership.statusCode
      );
    }

    await Brand.updateStatus(
      brandId,
      status
    );

    const updatedBrand =
      await Brand.getById(
        brandId
      );

    return success(
      res,
      status === "active"
        ? "Brand activated successfully"
        : "Brand deactivated successfully",
      updatedBrand
    );
  } catch (err) {
    console.error(
      "CHANGE BRAND STATUS ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to change brand status",
      500,
      err.message
    );
  }
};
exports.getAvailableBrands = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const role = String(req.user?.role || "").trim();
    let companyId = Number(req.user?.company_id);

    if (!userId || Number.isNaN(userId)) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    // Resolve designer membership from the database so an older or
    // stale JWT cannot hide a valid SME-company relationship.
    if (role === "designer") {
      const designer = await Designer.getById(userId);

      if (!designer?.company_id) {
        return error(
          res,
          "Designer is not associated with a company",
          403
        );
      }

      if (designer.membership_status !== "active") {
        return error(res, "Designer company membership is disabled", 403);
      }

      companyId = Number(designer.company_id);
    } else {
      // SME/exporter company ID iva muri companies table.
      const company = await Company.getByOwnerUserId(userId);

      if (!company) {
        return error(
          res,
          "No company account is associated with this user",
          404
        );
      }

      companyId = company.id;
    }

    const brands = await Brand.getByCompany(companyId);

    const activeBrands = brands.filter(
      (brand) => brand.status === "active"
    );

    return success(
      res,
      "Available brands fetched successfully",
      activeBrands
    );
  } catch (err) {
    console.error(
      "GET AVAILABLE BRANDS ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to fetch available brands",
      500,
      err.message
    );
  }
};
