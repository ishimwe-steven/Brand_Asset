const fs = require("fs");
const path = require("path");

require("dotenv").config();

/**
 * Hugging Face Space configuration.
 *
 * Render Environment:
 * HF_SPACE_ID=Stevo12/verifyai-ai-service
 *
 * HF_TOKEN is optional because the Space is currently public.
 */
const HF_SPACE_ID =
  process.env.HF_SPACE_ID || "Stevo12/verifyai-ai-service";

const HF_TOKEN = String(
  process.env.HF_TOKEN || ""
).trim();

/**
 * Cache the Gradio client connection.
 * This prevents reconnecting to Hugging Face for every request.
 */
let gradioClientPromise = null;

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

  const normalizedPath = String(storedPath).replace(
    /^[/\\]+/,
    ""
  );

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
  const olderUploadPath = path.resolve(
    __dirname,
    "..",
    normalizedPath
  );

  if (fs.existsSync(olderUploadPath)) {
    return olderUploadPath;
  }

  return currentUploadPath;
};

/**
 * Confirms that a file exists before sending it
 * to the Hugging Face AI service.
 */
const ensureFileExists = (
  filePath,
  label = "File"
) => {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(
      `${label} not found: ${filePath || "missing path"}`
    );
  }
};

/**
 * Returns a MIME type based on the file extension.
 */
const getMimeType = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".pdf": "application/pdf",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  return mimeTypes[extension] || "application/octet-stream";
};

/**
 * Opens and caches the connection to the Hugging Face
 * Gradio Space.
 */
const getGradioClient = async () => {
  if (!gradioClientPromise) {
    gradioClientPromise = import("@gradio/client")
      .then(async ({ Client }) => {
        const options = {};

        if (HF_TOKEN) {
          options.token = HF_TOKEN;
        }

        console.log(
          `Connecting to Hugging Face Space: ${HF_SPACE_ID}`
        );

        const client = await Client.connect(
          HF_SPACE_ID,
          options
        );

        console.log(
          `Connected to Hugging Face Space: ${HF_SPACE_ID}`
        );

        return client;
      })
      .catch((error) => {
        gradioClientPromise = null;

        console.error(
          "Hugging Face connection failed:",
          error?.message || error
        );

        throw error;
      });
  }

  return gradioClientPromise;
};

/**
 * Converts a local file into a format accepted by
 * the Gradio JavaScript client.
 */
const createGradioFile = async (
  filePath,
  label = "File"
) => {
  ensureFileExists(filePath, label);

  const { handle_file } = await import(
    "@gradio/client"
  );

  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(filePath);

  const fileBlob = new Blob(
    [fileBuffer],
    {
      type: mimeType,
    }
  );

  return handle_file(fileBlob);
};

/**
 * Calls an API endpoint exposed by the Hugging Face
 * Gradio application.
 */
const callGradioEndpoint = async (
  endpoint,
  payload,
  fallbackMessage
) => {
  try {
    const client = await getGradioClient();

    console.log(
      `Calling Hugging Face endpoint: ${endpoint}`
    );

    const response = await client.predict(
      endpoint,
      payload
    );

    /*
     * Gradio normally returns:
     * {
     *   type: "data",
     *   data: [result],
     *   endpoint: ...
     * }
     */
    let result;

    if (
      Array.isArray(response?.data) &&
      response.data.length === 1
    ) {
      result = response.data[0];
    } else if (response?.data !== undefined) {
      result = response.data;
    } else {
      result = response;
    }

    if (
      result === undefined ||
      result === null
    ) {
      throw new Error(
        "Hugging Face AI returned an empty response"
      );
    }

    console.log(
      `Hugging Face endpoint completed: ${endpoint}`
    );

    return result;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      fallbackMessage;

    console.error(
      `AI SERVICE ERROR [${endpoint}]:`,
      message
    );

    /*
     * Reconnect on the next request in case the Space
     * slept, restarted or disconnected.
     */
    gradioClientPromise = null;

    throw new Error(message);
  }
};

/**
 * OCR + QR analysis.
 *
 * Hugging Face Gradio API:
 * API name: /analyze
 *
 * Parameters:
 * file_value
 */
const analyzePackaging = async (upload) => {
  if (!upload) {
    throw new Error(
      "Packaging upload information is missing"
    );
  }

  const packagingPath = resolveStoredFilePath(
    upload.file_path
  );

  const packagingFile = await createGradioFile(
    packagingPath,
    "Packaging image"
  );

  return callGradioEndpoint(
    "/analyze",
    [packagingFile],
    "Packaging analysis failed"
  );
};

/**
 * Checks image/logo quality.
 *
 * Hugging Face Gradio API:
 * API name: /verify_logo_quality
 *
 * Parameters:
 * file_value
 */
const verifyLogoQuality = async (filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : resolveStoredFilePath(filePath);

  const logoFile = await createGradioFile(
    absolutePath,
    "Logo image"
  );

  return callGradioEndpoint(
    "/verify_logo_quality",
    [logoFile],
    "Logo quality verification failed"
  );
};

/**
 * Detects the official logo inside packaging.
 *
 * Hugging Face Gradio API:
 * API name: /detect_logo_bbox
 *
 * Parameters:
 * packaging_value
 * reference_logo_value
 * threshold
 */
const detectLogoBBox = async (
  upload,
  options = {}
) => {
  if (!upload) {
    throw new Error(
      "Packaging upload information is missing"
    );
  }

  const {
    threshold = 0.6,
  } = options;

  const packagingPath = resolveStoredFilePath(
    upload.file_path
  );

  const officialLogoPath = resolveStoredFilePath(
    upload.official_logo_path
  );

  const packagingFile = await createGradioFile(
    packagingPath,
    "Packaging image"
  );

  const officialLogoFile = await createGradioFile(
    officialLogoPath,
    "Official logo"
  );

  return callGradioEndpoint(
    "/detect_logo_bbox",
    [
      packagingFile,
      officialLogoFile,
      Number(threshold),
    ],
    "Automatic logo detection failed"
  );
};

/**
 * Detects the official logo and verifies its placement.
 *
 * Hugging Face Gradio API:
 * API name: /detect_and_verify_logo_placement
 *
 * Parameters:
 * packaging_value
 * reference_logo_value
 * threshold
 * preferred_positions
 */
const detectAndVerifyLogoPlacement = async (
  upload,
  options = {}
) => {
  if (!upload) {
    throw new Error(
      "Packaging upload information is missing"
    );
  }

  const {
    threshold = 0.6,
    preferredPositions,
  } = options;

  const packagingPath = resolveStoredFilePath(
    upload.file_path
  );

  const officialLogoPath = resolveStoredFilePath(
    upload.official_logo_path
  );

  let positions =
    preferredPositions ||
    upload.preferred_logo_positions ||
    "top_left,top_center";

  if (Array.isArray(positions)) {
    positions = positions.join(",");
  }

  if (
    !positions ||
    typeof positions !== "string"
  ) {
    positions = "top_left,top_center";
  }

  const packagingFile = await createGradioFile(
    packagingPath,
    "Packaging image"
  );

  const officialLogoFile = await createGradioFile(
    officialLogoPath,
    "Official logo"
  );

  return callGradioEndpoint(
    "/detect_and_verify_logo_placement",
    [
      packagingFile,
      officialLogoFile,
      Number(threshold),
      positions,
    ],
    "Logo placement verification failed"
  );
};

/**
 * Compatibility function.
 *
 * Hugging Face does not expose a separate endpoint called
 * /verify_logo_placement.
 *
 * Therefore, this function uses:
 * /detect_and_verify_logo_placement
 */
const verifyLogoPlacement = async (
  upload,
  bbox,
  options = {}
) => {
  if (!bbox) {
    throw new Error(
      "Logo bounding box is required"
    );
  }

  return detectAndVerifyLogoPlacement(
    upload,
    options
  );
};

/**
 * Detects the logo and compares its brand colours
 * with the official logo.
 *
 * Hugging Face Gradio API:
 * API name: /detect_and_verify_brand_colours
 *
 * Parameters:
 * packaging_value
 * official_logo_value
 * threshold
 * number_of_colors
 */
const detectAndVerifyBrandColours = async (
  upload,
  options = {}
) => {
  if (!upload) {
    throw new Error(
      "Packaging upload information is missing"
    );
  }

  const {
    threshold = 0.6,
    numberOfColors = 4,
  } = options;

  const packagingPath = resolveStoredFilePath(
    upload.file_path
  );

  const officialLogoPath = resolveStoredFilePath(
    upload.official_logo_path
  );

  const packagingFile = await createGradioFile(
    packagingPath,
    "Packaging image"
  );

  const officialLogoFile = await createGradioFile(
    officialLogoPath,
    "Official logo"
  );

  return callGradioEndpoint(
    "/detect_and_verify_brand_colours",
    [
      packagingFile,
      officialLogoFile,
      Number(threshold),
      Number(numberOfColors),
    ],
    "Brand colour verification failed"
  );
};

/**
 * Compatibility function.
 *
 * Hugging Face does not expose a separate endpoint called
 * /verify_brand_colour_consistency.
 *
 * Therefore, this function uses:
 * /detect_and_verify_brand_colours
 */
const verifyBrandColourConsistency = async (
  upload,
  bbox,
  options = {}
) => {
  if (!bbox) {
    throw new Error(
      "Logo bounding box is required"
    );
  }

  return detectAndVerifyBrandColours(
    upload,
    options
  );
};

/**
 * Extracts the official brand profile.
 *
 * Hugging Face Gradio API:
 * API name: /extract_brand_profile
 *
 * Parameters:
 * file_value
 */
const extractBrandProfile = async (
  officialLogoPath
) => {
  const absoluteLogoPath = path.isAbsolute(
    officialLogoPath
  )
    ? officialLogoPath
    : resolveStoredFilePath(officialLogoPath);

  const officialLogoFile =
    await createGradioFile(
      absoluteLogoPath,
      "Official logo"
    );

  return callGradioEndpoint(
    "/extract_brand_profile",
    [officialLogoFile],
    "Brand profile extraction failed"
  );
};

/**
 * Extracts requirements from PDF or DOCX regulations.
 *
 * Hugging Face Gradio API:
 * API name: /extract_regulation_requirements
 *
 * Parameters:
 * file_value
 */
const extractRegulationRequirements = async (
  documentPath
) => {
  const absolutePath =
    path.isAbsolute(documentPath) &&
    fs.existsSync(documentPath)
      ? documentPath
      : resolveStoredFilePath(documentPath);

  const documentFile = await createGradioFile(
    absolutePath,
    "Regulation document"
  );

  return callGradioEndpoint(
    "/extract_regulation_requirements",
    [documentFile],
    "Regulation requirement extraction failed"
  );
};

/**
 * Verifies whether the detected logo matches
 * the official logo.
 *
 * Hugging Face Gradio API:
 * API name: /verify_logo_identity
 *
 * Parameters:
 * packaging_value
 * official_logo_value
 * x
 * y
 * width
 * height
 * text_score
 */
const verifyLogoIdentity = async (
  upload,
  bbox,
  textScore = 0
) => {
  if (!upload) {
    throw new Error(
      "Packaging upload information is missing"
    );
  }

  if (!bbox) {
    throw new Error(
      "Logo bounding box is required"
    );
  }

  const packagingPath = resolveStoredFilePath(
    upload.file_path
  );

  const officialLogoPath = resolveStoredFilePath(
    upload.official_logo_path
  );

  const packagingFile = await createGradioFile(
    packagingPath,
    "Packaging image"
  );

  const officialLogoFile = await createGradioFile(
    officialLogoPath,
    "Official logo"
  );

  return callGradioEndpoint(
    "/verify_logo_identity",
    [
      packagingFile,
      officialLogoFile,
      Number(bbox.x),
      Number(bbox.y),
      Number(bbox.width),
      Number(bbox.height),
      Number(textScore),
    ],
    "Multimodal logo verification failed"
  );
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