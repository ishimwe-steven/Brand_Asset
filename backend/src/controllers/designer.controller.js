const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const Designer = require("../models/designer.model");
const Company = require("../models/company.model");

const {
  success,
  error,
} = require("../utils/response");

const SALT_ROUNDS = 10;

// =========================
// Helper functions
// =========================

const getAuthenticatedUserId = (req) => {
  const userId = Number(req.user?.id);

  if (!userId || Number.isNaN(userId)) {
    return null;
  }

  return userId;
};

const getActiveCompanyForOwner = async (
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

const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

const generateTemporaryPassword = () => {
  const randomPart = crypto
    .randomBytes(5)
    .toString("hex");

  return `Ver@${randomPart}`;
};

const validateEmail = (email) => {
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailPattern.test(email);
};

// =========================
// Create Designer
// =========================

exports.createDesigner = async (
  req,
  res
) => {
  try {
    const ownerUserId =
      getAuthenticatedUserId(req);

    if (!ownerUserId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForOwner(
        ownerUserId
      );

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const name = String(
      req.body.name || ""
    ).trim();

    const email = normalizeEmail(
      req.body.email
    );

    if (!name) {
      return error(
        res,
        "Designer name is required",
        400
      );
    }

    if (!email) {
      return error(
        res,
        "Designer email is required",
        400
      );
    }

    if (!validateEmail(email)) {
      return error(
        res,
        "A valid designer email is required",
        400
      );
    }

    const emailAlreadyExists =
      await Designer.emailExists(email);

    if (emailAlreadyExists) {
      return error(
        res,
        "A user with this email already exists",
        409
      );
    }

    const temporaryPassword =
      generateTemporaryPassword();

    const hashedPassword =
      await bcrypt.hash(
        temporaryPassword,
        SALT_ROUNDS
      );

    const result =
      await Designer.create({
        companyId:
          companyResult.company.id,
        name,
        email,
        hashedPassword,
        createdBy: ownerUserId,
      });

    const createdDesigner =
      await Designer.getByIdAndCompany(
        result.userId,
        companyResult.company.id
      );

    return success(
      res,
      "Designer account created successfully",
      {
        designer: createdDesigner,

        // This password should only be
        // shown once to the SME.
        temporary_password:
          temporaryPassword,

        password_instruction:
          "Share this temporary password securely with the designer. The designer must change it after the first login.",
      },
      201
    );
  } catch (err) {
    console.error(
      "CREATE DESIGNER ERROR:",
      err.message
    );

    if (err.code === "ER_DUP_ENTRY") {
      return error(
        res,
        "A user with this email already exists",
        409
      );
    }

    return error(
      res,
      "Failed to create designer account",
      500,
      err.message
    );
  }
};

// =========================
// Get Company Designers
// =========================

exports.getMyDesigners = async (
  req,
  res
) => {
  try {
    const ownerUserId =
      getAuthenticatedUserId(req);

    if (!ownerUserId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForOwner(
        ownerUserId
      );

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const designers =
      await Designer.getByCompany(
        companyResult.company.id
      );

    const statistics =
      await Designer.countByCompany(
        companyResult.company.id
      );

    return success(
      res,
      "Company designers fetched successfully",
      {
        designers,
        statistics,
      }
    );
  } catch (err) {
    console.error(
      "GET DESIGNERS ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to fetch designers",
      500,
      err.message
    );
  }
};

// =========================
// Get One Designer
// =========================

exports.getDesignerById = async (
  req,
  res
) => {
  try {
    const ownerUserId =
      getAuthenticatedUserId(req);

    if (!ownerUserId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForOwner(
        ownerUserId
      );

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const designerId = Number(
      req.params.id
    );

    if (
      !designerId ||
      Number.isNaN(designerId)
    ) {
      return error(
        res,
        "Valid designer ID is required",
        400
      );
    }

    const designer =
      await Designer.getByIdAndCompany(
        designerId,
        companyResult.company.id
      );

    if (!designer) {
      return error(
        res,
        "Designer was not found in your company",
        404
      );
    }

    return success(
      res,
      "Designer fetched successfully",
      designer
    );
  } catch (err) {
    console.error(
      "GET DESIGNER ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to fetch designer",
      500,
      err.message
    );
  }
};

// =========================
// Update Designer
// =========================

exports.updateDesigner = async (
  req,
  res
) => {
  try {
    const ownerUserId =
      getAuthenticatedUserId(req);

    if (!ownerUserId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForOwner(
        ownerUserId
      );

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const designerId = Number(
      req.params.id
    );

    if (
      !designerId ||
      Number.isNaN(designerId)
    ) {
      return error(
        res,
        "Valid designer ID is required",
        400
      );
    }

    const existingDesigner =
      await Designer.getByIdAndCompany(
        designerId,
        companyResult.company.id
      );

    if (!existingDesigner) {
      return error(
        res,
        "Designer was not found in your company",
        404
      );
    }

    const name =
      req.body.name !== undefined
        ? String(req.body.name).trim()
        : existingDesigner.name;

    const email =
      req.body.email !== undefined
        ? normalizeEmail(req.body.email)
        : existingDesigner.email;

    if (!name) {
      return error(
        res,
        "Designer name cannot be empty",
        400
      );
    }

    if (!validateEmail(email)) {
      return error(
        res,
        "A valid designer email is required",
        400
      );
    }

    if (
      email !==
      existingDesigner.email.toLowerCase()
    ) {
      const emailAlreadyExists =
        await Designer.emailExists(email);

      if (emailAlreadyExists) {
        return error(
          res,
          "Another user already uses this email",
          409
        );
      }
    }

    await Designer.update(
      designerId,
      {
        name,
        email,
      }
    );

    const updatedDesigner =
      await Designer.getByIdAndCompany(
        designerId,
        companyResult.company.id
      );

    return success(
      res,
      "Designer updated successfully",
      updatedDesigner
    );
  } catch (err) {
    console.error(
      "UPDATE DESIGNER ERROR:",
      err.message
    );

    if (err.code === "ER_DUP_ENTRY") {
      return error(
        res,
        "Another user already uses this email",
        409
      );
    }

    return error(
      res,
      "Failed to update designer",
      500,
      err.message
    );
  }
};

// =========================
// Activate / Disable Designer
// =========================

exports.changeDesignerStatus = async (
  req,
  res
) => {
  try {
    const ownerUserId =
      getAuthenticatedUserId(req);

    if (!ownerUserId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForOwner(
        ownerUserId
      );

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const designerId = Number(
      req.params.id
    );

    const requestedStatus = String(
      req.body.status || ""
    )
      .trim()
      .toLowerCase();

    if (
      !designerId ||
      Number.isNaN(designerId)
    ) {
      return error(
        res,
        "Valid designer ID is required",
        400
      );
    }

    if (
      ![
        "active",
        "disabled",
        "inactive",
      ].includes(requestedStatus)
    ) {
      return error(
        res,
        "Status must be active or disabled",
        400
      );
    }

    const designer =
      await Designer.getByIdAndCompany(
        designerId,
        companyResult.company.id
      );

    if (!designer) {
      return error(
        res,
        "Designer was not found in your company",
        404
      );
    }

    const normalizedStatus =
      requestedStatus === "active"
        ? "active"
        : "disabled";

    const statusResult =
      await Designer.updateStatus(
        designerId,
        companyResult.company.id,
        normalizedStatus
      );

    const updatedDesigner =
      await Designer.getByIdAndCompany(
        designerId,
        companyResult.company.id
      );

    return success(
      res,
      normalizedStatus === "active"
        ? "Designer account activated successfully"
        : "Designer account disabled successfully",
      {
        designer: updatedDesigner,
        status_result: statusResult,
      }
    );
  } catch (err) {
    console.error(
      "CHANGE DESIGNER STATUS ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to change designer status",
      500,
      err.message
    );
  }
};

// =========================
// Reset Designer Password
// =========================

exports.resetDesignerPassword = async (
  req,
  res
) => {
  try {
    const ownerUserId =
      getAuthenticatedUserId(req);

    if (!ownerUserId) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const companyResult =
      await getActiveCompanyForOwner(
        ownerUserId
      );

    if (!companyResult.company) {
      return error(
        res,
        companyResult.message,
        companyResult.statusCode
      );
    }

    const designerId = Number(
      req.params.id
    );

    if (
      !designerId ||
      Number.isNaN(designerId)
    ) {
      return error(
        res,
        "Valid designer ID is required",
        400
      );
    }

    const designer =
      await Designer.getByIdAndCompany(
        designerId,
        companyResult.company.id
      );

    if (!designer) {
      return error(
        res,
        "Designer was not found in your company",
        404
      );
    }

    const temporaryPassword =
      generateTemporaryPassword();

    const hashedPassword =
      await bcrypt.hash(
        temporaryPassword,
        SALT_ROUNDS
      );

    const affectedRows =
      await Designer.resetPassword(
        designerId,
        hashedPassword
      );

    if (!affectedRows) {
      return error(
        res,
        "Designer password could not be reset",
        400
      );
    }

    return success(
      res,
      "Designer temporary password generated successfully",
      {
        designer_id: designerId,
        temporary_password:
          temporaryPassword,
        password_instruction:
          "Share this temporary password securely. The designer must change it after login.",
      }
    );
  } catch (err) {
    console.error(
      "RESET DESIGNER PASSWORD ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to reset designer password",
      500,
      err.message
    );
  }
};