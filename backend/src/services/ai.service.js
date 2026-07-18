const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const AI_REQUEST_TIMEOUT = Number(
  process.env.AI_REQUEST_TIMEOUT || 120000
);

/**
 * Converts a stored URL path such as:
 * /uploads/file.png
 *
 * into an absolute local filesystem path.
 */
const resolveStoredFilePath = (storedPath) => {
  if (!storedPath) {
    throw new Error("File path is missing");
  }

  const normalizedPath = String(storedPath).replace(/^[/\\]+/, "");

  const currentUploadPath = path.resolve(
    __dirname,
    "..",
    "..",
    normalizedPath
  );

  if (fs.existsSync(currentUploadPath)) {
    return currentUploadPath;
  }

  // Compatibility for files created by the older multer setup.
  return path.resolve(__dirname, "..", normalizedPath);
};

/**
 * Confirms that a file exists before sending it
 * to the Python AI service.
 */
const ensureFileExists = (filePath, label = "File") => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath || "missing path"}`);
  }
};

/**
 * Extracts a useful message from Axios/FastAPI errors.
 */
const getAiErrorMessage = (err, fallbackMessage) => {
  return (
    err.response?.data?.detail ||
    err.response?.data?.message ||
    err.message ||
    fallbackMessage
  );
};

/**
 * Sends multipart/form-data to FastAPI.
 */
const postMultipart = async (endpoint, form, fallbackMessage) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}${endpoint}`,
      form,
      {
        headers: form.getHeaders(),
        timeout: AI_REQUEST_TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    return response.data;
  } catch (err) {
    const message = getAiErrorMessage(err, fallbackMessage);

    console.error(`AI SERVICE ERROR [${endpoint}]:`, message);

    throw new Error(message);
  }
};

/**
 * OCR + barcode + QR analysis.
 *
 * FastAPI:
 * POST /analyze
 * field: file
 */
const analyzePackaging = async (upload) => {
  const packagingPath = resolveStoredFilePath(upload.file_path);

  ensureFileExists(packagingPath, "Packaging image");

  const form = new FormData();

  form.append(
    "file",
    fs.createReadStream(packagingPath)
  );

  return postMultipart(
    "/analyze",
    form,
    "Packaging analysis failed"
  );
};

/**
 * Checks the quality of an image.
 *
 * FastAPI:
 * POST /verify-logo-quality
 * field: file
 *
 * This can be used with the logo region later,
 * but currently it accepts a complete image file.
 */
const verifyLogoQuality = async (filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : resolveStoredFilePath(filePath);

  ensureFileExists(absolutePath, "Logo image");

  const form = new FormData();

  form.append(
    "file",
    fs.createReadStream(absolutePath)
  );

  return postMultipart(
    "/verify-logo-quality",
    form,
    "Logo quality verification failed"
  );
};

/**
 * Detects the official logo inside packaging.
 *
 * FastAPI:
 * POST /detect-logo-bbox
 *
 * fields:
 * packaging
 * reference_logo
 * threshold
 */
const detectLogoBBox = async (
  upload,
  options = {}
) => {
  const {
    threshold = 0.6,
  } = options;

  const packagingPath = resolveStoredFilePath(upload.file_path);
  const officialLogoPath = resolveStoredFilePath(
    upload.official_logo_path
  );

  ensureFileExists(packagingPath, "Packaging image");
  ensureFileExists(officialLogoPath, "Official logo");

  const form = new FormData();

  form.append(
    "packaging",
    fs.createReadStream(packagingPath)
  );

  form.append(
    "reference_logo",
    fs.createReadStream(officialLogoPath)
  );

  form.append(
    "threshold",
    String(threshold)
  );

  return postMultipart(
    "/detect-logo-bbox",
    form,
    "Automatic logo detection failed"
  );
};

/**
 * Detects the official logo and checks placement.
 *
 * FastAPI:
 * POST /detect-and-verify-logo-placement
 *
 * fields:
 * packaging
 * reference_logo
 * threshold
 * preferred_positions
 */
const detectAndVerifyLogoPlacement = async (
  upload,
  options = {}
) => {
  const {
    threshold = 0.6,
    preferredPositions,
  } = options;

  const packagingPath = resolveStoredFilePath(upload.file_path);
  const officialLogoPath = resolveStoredFilePath(
    upload.official_logo_path
  );

  ensureFileExists(packagingPath, "Packaging image");
  ensureFileExists(officialLogoPath, "Official logo");

  let positions = preferredPositions;

  if (!positions) {
    positions = upload.preferred_logo_positions;
  }

  if (Array.isArray(positions)) {
    positions = positions.join(",");
  }

  if (!positions || typeof positions !== "string") {
    positions = "top_left,top_center";
  }

  const form = new FormData();

  form.append(
    "packaging",
    fs.createReadStream(packagingPath)
  );

  form.append(
    "reference_logo",
    fs.createReadStream(officialLogoPath)
  );

  form.append(
    "threshold",
    String(threshold)
  );

  form.append(
    "preferred_positions",
    positions
  );

  return postMultipart(
    "/detect-and-verify-logo-placement",
    form,
    "Logo placement verification failed"
  );
};

/**
 * Checks placement using an already known bounding box.
 *
 * FastAPI:
 * POST /verify-logo-placement
 *
 * fields:
 * file
 * x
 * y
 * width
 * height
 * preferred_positions
 */
const verifyLogoPlacement = async (
  upload,
  bbox,
  options = {}
) => {
  if (!bbox) {
    throw new Error("Logo bounding box is required");
  }

  const {
    preferredPositions,
  } = options;

  const packagingPath = resolveStoredFilePath(upload.file_path);

  ensureFileExists(packagingPath, "Packaging image");

  let positions =
    preferredPositions ||
    upload.preferred_logo_positions ||
    "top_left,top_center";

  if (Array.isArray(positions)) {
    positions = positions.join(",");
  }

  const form = new FormData();

  form.append(
    "file",
    fs.createReadStream(packagingPath)
  );

  form.append("x", String(bbox.x));
  form.append("y", String(bbox.y));
  form.append("width", String(bbox.width));
  form.append("height", String(bbox.height));

  form.append(
    "preferred_positions",
    positions
  );

  return postMultipart(
    "/verify-logo-placement",
    form,
    "Logo placement verification failed"
  );
};

/**
 * Automatically detects the logo and compares its colours
 * with the official logo.
 *
 * FastAPI:
 * POST /detect-and-verify-brand-colours
 *
 * fields:
 * packaging
 * official_logo
 * threshold
 * number_of_colors
 */
const detectAndVerifyBrandColours = async (
  upload,
  options = {}
) => {
  const {
    threshold = 0.6,
    numberOfColors = 4,
  } = options;

  const packagingPath = resolveStoredFilePath(upload.file_path);
  const officialLogoPath = resolveStoredFilePath(
    upload.official_logo_path
  );

  ensureFileExists(packagingPath, "Packaging image");
  ensureFileExists(officialLogoPath, "Official logo");

  const form = new FormData();

  form.append(
    "packaging",
    fs.createReadStream(packagingPath)
  );

  form.append(
    "official_logo",
    fs.createReadStream(officialLogoPath)
  );

  form.append(
    "threshold",
    String(threshold)
  );

  form.append(
    "number_of_colors",
    String(numberOfColors)
  );

  return postMultipart(
    "/detect-and-verify-brand-colours",
    form,
    "Brand colour verification failed"
  );
};

/**
 * Compares colours using a known logo bounding box.
 *
 * FastAPI:
 * POST /verify-brand-colour-consistency
 *
 * fields:
 * packaging
 * official_logo
 * x
 * y
 * width
 * height
 * number_of_colors
 */
const verifyBrandColourConsistency = async (
  upload,
  bbox,
  options = {}
) => {
  if (!bbox) {
    throw new Error("Logo bounding box is required");
  }

  const {
    numberOfColors = 4,
  } = options;

  const packagingPath = resolveStoredFilePath(upload.file_path);
  const officialLogoPath = resolveStoredFilePath(
    upload.official_logo_path
  );

  ensureFileExists(packagingPath, "Packaging image");
  ensureFileExists(officialLogoPath, "Official logo");

  const form = new FormData();

  form.append(
    "packaging",
    fs.createReadStream(packagingPath)
  );

  form.append(
    "official_logo",
    fs.createReadStream(officialLogoPath)
  );

  form.append("x", String(bbox.x));
  form.append("y", String(bbox.y));
  form.append("width", String(bbox.width));
  form.append("height", String(bbox.height));

  form.append(
    "number_of_colors",
    String(numberOfColors)
  );

  return postMultipart(
    "/verify-brand-colour-consistency",
    form,
    "Brand colour consistency verification failed"
  );
};

/**
 * Extracts the official brand profile once during brand creation.
 *
 * FastAPI:
 * POST /extract-brand-profile
 *
 * fields: official_logo. Colour count and palette are AI-derived.
 */
const extractBrandProfile = async (
  officialLogoPath,
  options = {}
) => {
  const absoluteLogoPath = path.isAbsolute(officialLogoPath)
    ? officialLogoPath
    : resolveStoredFilePath(officialLogoPath);

  ensureFileExists(absoluteLogoPath, "Official logo");

  const form = new FormData();

  form.append(
    "official_logo",
    fs.createReadStream(absoluteLogoPath)
  );

  return postMultipart(
    "/extract-brand-profile",
    form,
    "Brand profile extraction failed"
  );
};

const extractRegulationRequirements = async (documentPath) => {
  const absolutePath = path.isAbsolute(documentPath) && fs.existsSync(documentPath)
    ? documentPath
    : resolveStoredFilePath(documentPath);
  ensureFileExists(absolutePath, "Regulation document");
  const form = new FormData();
  form.append("document", fs.createReadStream(absolutePath), {
    filename: path.basename(absolutePath),
  });
  return postMultipart(
    "/extract-regulation-requirements",
    form,
    "Regulation requirement extraction failed"
  );
};

const verifyLogoIdentity = async (upload, bbox, textScore = 0) => {
  const packagingPath = resolveStoredFilePath(upload.file_path);
  const officialLogoPath = resolveStoredFilePath(upload.official_logo_path);
  ensureFileExists(packagingPath, "Packaging image");
  ensureFileExists(officialLogoPath, "Official logo");
  const form = new FormData();
  form.append("packaging", fs.createReadStream(packagingPath));
  form.append("official_logo", fs.createReadStream(officialLogoPath));
  for (const key of ["x", "y", "width", "height"]) form.append(key, String(bbox[key]));
  form.append("text_score", String(textScore));
  return postMultipart("/verify-logo-identity", form, "Multimodal logo verification failed");
};

module.exports = {
  analyzePackaging,
  verifyLogoQuality,
  detectLogoBBox,
  detectAndVerifyLogoPlacement,
  verifyLogoPlacement,
  detectAndVerifyBrandColours,
  verifyBrandColourConsistency,
  extractBrandProfile,
  extractRegulationRequirements,
  verifyLogoIdentity,
};
