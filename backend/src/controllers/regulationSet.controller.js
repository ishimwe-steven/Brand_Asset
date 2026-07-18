const fs = require("fs");
const path = require("path");

const RegulationSetModel = require(
  "../models/regulationSet.model"
);
const Regulation = require("../models/regulation.model");
const { extractRegulationRequirements } = require("../services/ai.service");

const processRegulationDocument = async (regulationSet) => {
  await RegulationSetModel.markAsProcessing(regulationSet.id);
  try {
    const extraction = await extractRegulationRequirements(regulationSet.document_path);
    const requirements = extraction?.data?.requirements || [];
    if (!requirements.length) throw new Error("AI did not extract any packaging requirements.");
    await Regulation.replaceForRegulationSet(regulationSet, requirements);
    await RegulationSetModel.saveExtractedRequirements(regulationSet.id, requirements);
    return requirements;
  } catch (error) {
    await RegulationSetModel.markProcessingFailed(regulationSet.id, error.message);
    throw error;
  }
};

// =========================================================
// HELPER: DELETE AN UPLOADED FILE SAFELY
// =========================================================
const deleteFileSafely = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.access(filePath);
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Failed to delete uploaded regulation file:",
        error.message
      );
    }
  }
};

// =========================================================
// HELPER: GET LOGGED-IN USER ID
// Supports different auth middleware response structures
// =========================================================
const getAuthenticatedUserId = (req) => {
  return (
    req.user?.id ||
    req.user?.user_id ||
    req.user?.userId ||
    null
  );
};

// =========================================================
// HELPER: VALIDATE POSITIVE INTEGER
// =========================================================
const isPositiveInteger = (value) => {
  const numberValue = Number(value);

  return (
    Number.isInteger(numberValue) &&
    numberValue > 0
  );
};

// =========================================================
// GET ALL REGULATION SETS
// GET /api/regulation-sets
// =========================================================
const getRegulationSets = async (req, res) => {
  try {
    const regulationSets =
      await RegulationSetModel.getAll();

    return res.status(200).json({
      success: true,
      message:
        "Regulation sets retrieved successfully.",
      data: regulationSets,
    });
  } catch (error) {
    console.error(
      "Get regulation sets error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load regulation sets.",
    });
  }
};

// =========================================================
// GET ONE REGULATION SET
// GET /api/regulation-sets/:id
// =========================================================
const getRegulationSetById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isPositiveInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid regulation set ID.",
      });
    }

    const regulationSet =
      await RegulationSetModel.getById(id);

    if (!regulationSet) {
      return res.status(404).json({
        success: false,
        message: "Regulation set not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Regulation set retrieved successfully.",
      data: regulationSet,
    });
  } catch (error) {
    console.error(
      "Get regulation set by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve regulation set.",
    });
  }
};

// =========================================================
// CREATE REGULATION SET
// POST /api/regulation-sets
// =========================================================
const createRegulationSet = async (
  req,
  res
) => {
  let regulationSetId = null;

  try {
    const {
      market_id,
      category_id,
      title,
      version,
      authority,
      effective_date,
      description,
    } = req.body;

    // -----------------------------------------------------
    // Validate required fields
    // -----------------------------------------------------
    if (!market_id) {
      await deleteFileSafely(req.file?.path);

      return res.status(400).json({
        success: false,
        message: "Destination market is required.",
      });
    }

    if (!category_id) {
      await deleteFileSafely(req.file?.path);

      return res.status(400).json({
        success: false,
        message: "Product category is required.",
      });
    }

    if (!title || !String(title).trim()) {
      await deleteFileSafely(req.file?.path);

      return res.status(400).json({
        success: false,
        message: "Regulation title is required.",
      });
    }

    if (
      !authority ||
      !String(authority).trim()
    ) {
      await deleteFileSafely(req.file?.path);

      return res.status(400).json({
        success: false,
        message:
          "Regulation source or authority is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Official regulation document is required.",
      });
    }

    // -----------------------------------------------------
    // Validate IDs
    // -----------------------------------------------------
    if (!isPositiveInteger(market_id)) {
      await deleteFileSafely(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Invalid destination market ID.",
      });
    }

    if (!isPositiveInteger(category_id)) {
      await deleteFileSafely(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Invalid product category ID.",
      });
    }

    // -----------------------------------------------------
    // Check market existence
    // -----------------------------------------------------
    const marketExists =
      await RegulationSetModel.marketExists(
        market_id
      );

    if (!marketExists) {
      await deleteFileSafely(req.file.path);

      return res.status(404).json({
        success: false,
        message:
          "Selected destination market does not exist.",
      });
    }

    // -----------------------------------------------------
    // Check category existence
    // -----------------------------------------------------
    const categoryExists =
      await RegulationSetModel.categoryExists(
        category_id
      );

    if (!categoryExists) {
      await deleteFileSafely(req.file.path);

      return res.status(404).json({
        success: false,
        message:
          "Selected product category does not exist.",
      });
    }

    // -----------------------------------------------------
    // Check duplicate regulation set
    // -----------------------------------------------------
    const cleanedTitle = String(title).trim();

    const cleanedVersion = version
      ? String(version).trim()
      : null;

    const duplicateExists =
      await RegulationSetModel.duplicateExists({
        market_id,
        category_id,
        title: cleanedTitle,
        version: cleanedVersion,
      });

    if (duplicateExists) {
      await deleteFileSafely(req.file.path);

      return res.status(409).json({
        success: false,
        message:
          "A regulation set with the same market, category, title and version already exists.",
      });
    }

    // -----------------------------------------------------
    // Get logged-in admin ID
    // -----------------------------------------------------
    const createdBy =
      getAuthenticatedUserId(req);

    // -----------------------------------------------------
    // Build public file path
    // -----------------------------------------------------
    const documentPath =
      `/uploads/regulations/${req.file.filename}`;

    // -----------------------------------------------------
    // Save regulation set
    // -----------------------------------------------------
    regulationSetId = await RegulationSetModel.create({
        market_id: Number(market_id),
        category_id: Number(category_id),
        title: cleanedTitle,
        version: cleanedVersion,

        authority: String(
          authority
        ).trim(),

        effective_date:
          effective_date || null,

        description: description
          ? String(description).trim()
          : null,

        document_path: documentPath,

        original_filename:
          req.file.originalname,

        document_type:
          req.file.mimetype,

        created_by: createdBy,
      });

    let createdRegulationSet = await RegulationSetModel.getById(regulationSetId);
    await processRegulationDocument(createdRegulationSet);
    createdRegulationSet = await RegulationSetModel.getById(regulationSetId);

    return res.status(201).json({
      success: true,
      message:
        "Regulation document uploaded, extracted and activated successfully.",
      data: createdRegulationSet,
    });
  } catch (error) {
    console.error(
      "Create regulation set error:",
      error
    );

    if (!regulationSetId) {
      await deleteFileSafely(req.file?.path);
    }

    return res.status(500).json({
      success: false,
      message: regulationSetId
        ? "Regulation document was saved, but requirement extraction failed. You can reprocess it."
        : "Failed to upload regulation document.",
      details: error.message,
    });
  }
};

// =========================================================
// UPDATE REGULATION SET STATUS
// PATCH /api/regulation-sets/:id/status
// =========================================================
const updateRegulationSetStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isPositiveInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid regulation set ID.",
      });
    }

    const allowedStatuses = [
      "active",
      "inactive",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be active or inactive.",
      });
    }

    const regulationSet =
      await RegulationSetModel.getById(id);

    if (!regulationSet) {
      return res.status(404).json({
        success: false,
        message: "Regulation set not found.",
      });
    }

    if (
      regulationSet.status === "processing"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This regulation set is still being processed by AI.",
      });
    }

    if (
      regulationSet.status ===
      "processing_failed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This regulation set cannot be activated because AI extraction failed.",
      });
    }

    if (
      status === "active" &&
      (!Array.isArray(
        regulationSet.extracted_requirements
      ) ||
        regulationSet.extracted_requirements
          .length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A regulation set without extracted requirements cannot be activated.",
      });
    }

    await RegulationSetModel.updateStatus(
      id,
      status
    );

    const updatedRegulationSet =
      await RegulationSetModel.getById(id);

    return res.status(200).json({
      success: true,
      message: `Regulation set changed to ${status}.`,
      data: updatedRegulationSet,
    });
  } catch (error) {
    console.error(
      "Update regulation set status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update regulation set status.",
    });
  }
};

// =========================================================
// DELETE REGULATION SET
// DELETE /api/regulation-sets/:id
// =========================================================
const deleteRegulationSet = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isPositiveInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid regulation set ID.",
      });
    }

    const regulationSet =
      await RegulationSetModel.getById(id);

    if (!regulationSet) {
      return res.status(404).json({
        success: false,
        message: "Regulation set not found.",
      });
    }

    const affectedRows =
      await RegulationSetModel.delete(id);

    if (affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Regulation set could not be deleted.",
      });
    }

    // -----------------------------------------------------
    // Delete physical document after DB deletion succeeds
    // -----------------------------------------------------
    if (regulationSet.document_path) {
      const relativePath =
        regulationSet.document_path.replace(
          /^\/+/,
          ""
        );

      const absolutePath = path.join(
        process.cwd(),
        "src",
        relativePath
      );

      await deleteFileSafely(absolutePath);
    }

    return res.status(200).json({
      success: true,
      message:
        "Regulation set deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete regulation set error:",
      error
    );

    if (
      error.code ===
      "ER_ROW_IS_REFERENCED_2"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This regulation set cannot be deleted because it is already being used by verification records.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete regulation set.",
    });
  }
};

// =========================================================
// GET ACTIVE REGULATION SET FOR VERIFICATION
// GET /api/regulation-sets/active/:marketId/:categoryId
// =========================================================
const getActiveRegulationSet = async (
  req,
  res
) => {
  try {
    const { marketId, categoryId } =
      req.params;

    if (
      !isPositiveInteger(marketId) ||
      !isPositiveInteger(categoryId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid market and category IDs are required.",
      });
    }

    const regulationSet =
      await RegulationSetModel.getActiveByMarketAndCategory(
        marketId,
        categoryId
      );

    if (!regulationSet) {
      return res.status(404).json({
        success: false,
        message:
          "No active regulation set was found for the selected market and product category.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Active regulation set retrieved successfully.",
      data: regulationSet,
    });
  } catch (error) {
    console.error(
      "Get active regulation set error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve active regulation requirements.",
    });
  }
};

// =========================================================
// GET REGULATION SET STATISTICS
// GET /api/regulation-sets/statistics
// =========================================================
const getRegulationSetStatistics = async (
  req,
  res
) => {
  try {
    const statistics =
      await RegulationSetModel.countByStatus();

    return res.status(200).json({
      success: true,
      message:
        "Regulation set statistics retrieved successfully.",
      data: statistics,
    });
  } catch (error) {
    console.error(
      "Get regulation statistics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve regulation set statistics.",
    });
  }
};

const reprocessRegulationSet = async (req, res) => {
  try {
    const regulationSet = await RegulationSetModel.getById(req.params.id);
    if (!regulationSet) return res.status(404).json({ success: false, message: "Regulation set not found." });
    const requirements = await processRegulationDocument(regulationSet);
    return res.status(200).json({
      success: true,
      message: `${requirements.length} requirements extracted and activated.`,
      data: await RegulationSetModel.getById(regulationSet.id),
    });
  } catch (error) {
    return res.status(422).json({ success: false, message: "Regulation extraction failed.", details: error.message });
  }
};

module.exports = {
  getRegulationSets,
  getRegulationSetById,
  createRegulationSet,
  updateRegulationSetStatus,
  deleteRegulationSet,
  getActiveRegulationSet,
  getRegulationSetStatistics,
  reprocessRegulationSet,
};
