const fs = require("fs");
const path = require("path");
const { File } = require("node:buffer");

require("dotenv").config();

/**
 * Hugging Face Space configuration.
 *
 * Render Environment:
 * HF_SPACE_ID=Stevo12/verifyai-ai-service
 *
 * HF_TOKEN is optional because the Space is public.
 */
const HF_SPACE_ID =
  process.env.HF_SPACE_ID ||
  "Stevo12/verifyai-ai-service";

const HF_TOKEN = String(
  process.env.HF_TOKEN || ""
).trim();

/**
 * Allowed local file extensions.
 */
const ALLOWED_FILE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".pdf",
  ".docx",
]);

/**
 * Cache the Gradio client connection.
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

  const normalizedPath = String(storedPath)
    .trim()
    .replace(/^[/\\]+/, "");

  const possiblePaths = [
    path.resolve(
      __dirname,
      "..",
      "..",
      normalizedPath
    ),

    path.resolve(
      __dirname,
      "..",
      normalizedPath
    ),

    path.resolve(
      process.cwd(),
      normalizedPath
    ),
  ];

  const existingPath = possiblePaths.find(
    (candidatePath) =>
      fs.existsSync(candidatePath)
  );

  if (!existingPath) {
    throw new Error(
      `Uploaded file not found. Checked: ${possiblePaths.join(", ")}`
    );
  }

  return existingPath;
};

/**
 * Confirms that a file exists and is not a directory.
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

  const stats = fs.statSync(filePath);

  if (!stats.isFile()) {
    throw new Error(
      `${label} is not a valid file: ${filePath}`
    );
  }

  if (stats.size <= 0) {
    throw new Error(
      `${label} is empty: ${filePath}`
    );
  }
};

/**
 * Returns a MIME type based on the extension.
 */
const getMimeType = (filePath) => {
  const extension = path
    .extname(filePath)
    .toLowerCase();

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

  return (
    mimeTypes[extension] ||
    "application/octet-stream"
  );
};

/**
 * Extracts a useful error message from Gradio,
 * Hugging Face or general JavaScript errors.
 */
const getAiErrorMessage = (
  error,
  fallbackMessage
) => {
  const responseData =
    error?.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  return (
    responseData?.detail ||
    responseData?.message ||
    error?.data?.detail ||
    error?.data?.message ||
    error?.message ||
    fallbackMessage
  );
};

/**
 * Opens and caches the connection to the
 * Hugging Face Gradio Space.
 */
const getGradioClient = async () => {
  if (!gradioClientPromise) {
    gradioClientPromise = import(
      "@gradio/client"
    )
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
 * Converts a local file into a named File object
 * accepted by the Gradio JavaScript client.
 *
 * Important:
 * The File object preserves:
 * - filename
 * - extension
 * - MIME type
 * - file content
 */
const createGradioFile = async (
  filePath,
  label = "File"
) => {
  ensureFileExists(filePath, label);

  const { handle_file } = await import(
    "@gradio/client"
  );

  const filename = path.basename(filePath);

  const extension = path
    .extname(filename)
    .toLowerCase();

  if (!extension) {
    throw new Error(
      `${label} does not have a file extension: ${filename}`
    );
  }

  if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
    throw new Error(
      `${label} has an unsupported file extension: ${extension}`
    );
  }

  const mimeType = getMimeType(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const namedFile = new File(
    [fileBuffer],
    filename,
    {
      type: mimeType,
      lastModified: Date.now(),
    }
  );

  console.log(
    `${label} prepared for Hugging Face:`,
    {
      localPath: filePath,
      filename: namedFile.name,
      extension,
      mimeType: namedFile.type,
      size: namedFile.size,
    }
  );

  return handle_file(namedFile);
};

/**
 * Calls an API endpoint exposed by the
 * Hugging Face Gradio application.
 */
const callGradioEndpoint = async (
  endpoint,
  payload,
  fallbackMessage
) => {
  try {
    const client = await getGradioClient();

    console.log("--------------------------------");
    console.log("HUGGING FACE ENDPOINT:", endpoint);
    console.log("PAYLOAD LENGTH:", payload.length);

    payload.forEach((item, index) => {
      console.log(`PAYLOAD ITEM ${index}:`, item);
      console.log(`PAYLOAD ITEM ${index} TYPE:`, {
        constructor: item?.constructor?.name,
        name: item?.name,
        type: item?.type,
        size: item?.size,
        path: item?.path,
        url: item?.url,
        orig_name: item?.orig_name,
      });
    });

    console.log("--------------------------------");

    const response = await client.predict(
      endpoint,
      payload
    );

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

    if (result === undefined || result === null) {
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

    gradioClientPromise = null;

    throw new Error(message);
  }
};

/**
 * OCR and QR analysis.
 *
 * Hugging Face API:
 * /analyze
 *
 * Input:
 * file_value
 */
const analyzePackaging = async (upload) => {
  if (!upload) {
    throw new Error(
      "Packaging upload information is missing"
    );
  }

  if (!upload.file_path) {
    throw new Error(
      "Packaging image path is missing"
    );
  }

  const packagingPath =
    resolveStoredFilePath(
      upload.file_path
    );

  const packagingFile =
    await createGradioFile(
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
 * Checks image or logo quality.
 *
 * Hugging Face API:
 * /verify_logo_quality
 *
 * Input:
 * file_value
 */
const verifyLogoQuality = async (
  filePath
) => {
  if (!filePath) {
    throw new Error(
      "Logo image path is missing"
    );
  }

  const absolutePath =
    path.isAbsolute(filePath)
      ? filePath
      : resolveStoredFilePath(filePath);

  const logoFile =
    await createGradioFile(
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
 * Hugging Face API:
 * /detect_logo_bbox
 *
 * Inputs:
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

  if (!upload.file_path) {
    throw new Error(
      "Packaging image path is missing"
    );
  }

  if (!upload.official_logo_path) {
    throw new Error(
      "Official logo path is missing"
    );
  }

  const {
    threshold = 0.6,
  } = options;

  const packagingPath =
    resolveStoredFilePath(
      upload.file_path
    );

  const officialLogoPath =
    resolveStoredFilePath(
      upload.official_logo_path
    );

  const packagingFile =
    await createGradioFile(
      packagingPath,
      "Packaging image"
    );

  const officialLogoFile =
    await createGradioFile(
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
 * Detects the official logo and verifies
 * its placement.
 *
 * Hugging Face API:
 * /detect_and_verify_logo_placement
 *
 * Inputs:
 * packaging_value
 * reference_logo_value
 * threshold
 * preferred_positions
 */
const detectAndVerifyLogoPlacement =
  async (
    upload,
    options = {}
  ) => {
    if (!upload) {
      throw new Error(
        "Packaging upload information is missing"
      );
    }

    if (!upload.file_path) {
      throw new Error(
        "Packaging image path is missing"
      );
    }

    if (!upload.official_logo_path) {
      throw new Error(
        "Official logo path is missing"
      );
    }

    const {
      threshold = 0.6,
      preferredPositions,
    } = options;

    const packagingPath =
      resolveStoredFilePath(
        upload.file_path
      );

    const officialLogoPath =
      resolveStoredFilePath(
        upload.official_logo_path
      );

    let positions =
      preferredPositions ||
      upload.preferred_logo_positions ||
      "top_left,top_center";

    if (Array.isArray(positions)) {
      positions =
        positions.join(",");
    }

    if (
      !positions ||
      typeof positions !== "string"
    ) {
      positions =
        "top_left,top_center";
    }

    const packagingFile =
      await createGradioFile(
        packagingPath,
        "Packaging image"
      );

    const officialLogoFile =
      await createGradioFile(
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
 * Compatibility wrapper.
 *
 * There is no independent
 * /verify_logo_placement endpoint.
 *
 * This calls:
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
 * Detects the logo and compares its colours
 * with the official logo.
 *
 * Hugging Face API:
 * /detect_and_verify_brand_colours
 *
 * Inputs:
 * packaging_value
 * official_logo_value
 * threshold
 * number_of_colors
 */
const detectAndVerifyBrandColours =
  async (
    upload,
    options = {}
  ) => {
    if (!upload) {
      throw new Error(
        "Packaging upload information is missing"
      );
    }

    if (!upload.file_path) {
      throw new Error(
        "Packaging image path is missing"
      );
    }

    if (!upload.official_logo_path) {
      throw new Error(
        "Official logo path is missing"
      );
    }

    const {
      threshold = 0.6,
      numberOfColors = 4,
    } = options;

    const packagingPath =
      resolveStoredFilePath(
        upload.file_path
      );

    const officialLogoPath =
      resolveStoredFilePath(
        upload.official_logo_path
      );

    const packagingFile =
      await createGradioFile(
        packagingPath,
        "Packaging image"
      );

    const officialLogoFile =
      await createGradioFile(
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
 * Compatibility wrapper.
 *
 * There is no independent endpoint called:
 * /verify_brand_colour_consistency
 *
 * This calls:
 * /detect_and_verify_brand_colours
 */
const verifyBrandColourConsistency =
  async (
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
 * Hugging Face API:
 * /extract_brand_profile
 *
 * Input:
 * file_value
 */
const extractBrandProfile = async (
  officialLogoPath
) => {
  if (!officialLogoPath) {
    throw new Error(
      "Official logo path is missing"
    );
  }

  const absoluteLogoPath =
    path.isAbsolute(officialLogoPath)
      ? officialLogoPath
      : resolveStoredFilePath(
          officialLogoPath
        );

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
 * Extracts requirements from a PDF or DOCX
 * regulation document.
 *
 * Hugging Face API:
 * /extract_regulation_requirements
 *
 * Input:
 * file_value
 */
const extractRegulationRequirements =
  async (documentPath) => {
    if (!documentPath) {
      throw new Error(
        "Regulation document path is missing"
      );
    }

    const absolutePath =
      path.isAbsolute(documentPath) &&
      fs.existsSync(documentPath)
        ? documentPath
        : resolveStoredFilePath(
            documentPath
          );

    const documentFile =
      await createGradioFile(
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
 * Hugging Face API:
 * /verify_logo_identity
 *
 * Inputs:
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

  if (!upload.file_path) {
    throw new Error(
      "Packaging image path is missing"
    );
  }

  if (!upload.official_logo_path) {
    throw new Error(
      "Official logo path is missing"
    );
  }

  if (!bbox) {
    throw new Error(
      "Logo bounding box is required"
    );
  }

  const packagingPath =
    resolveStoredFilePath(
      upload.file_path
    );

  const officialLogoPath =
    resolveStoredFilePath(
      upload.official_logo_path
    );

  const packagingFile =
    await createGradioFile(
      packagingPath,
      "Packaging image"
    );

  const officialLogoFile =
    await createGradioFile(
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