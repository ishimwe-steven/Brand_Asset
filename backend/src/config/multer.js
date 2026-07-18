const multer = require("multer");
const path = require("path");
const fs = require("fs");

const packagingUploadDir = path.resolve(
  __dirname,
  "../../uploads"
);

const brandUploadDir = path.resolve(
  __dirname,
  "../../uploads/brands"
);

fs.mkdirSync(packagingUploadDir, {
  recursive: true,
});

fs.mkdirSync(brandUploadDir, {
  recursive: true,
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const imageFileFilter = (_req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    const uploadError = new Error(
      "Only JPG, JPEG, PNG and WEBP images are allowed."
    );

    uploadError.statusCode = 400;

    return cb(uploadError, false);
  }

  return cb(null, true);
};

const createFilename = (file) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const originalBaseName = path
    .basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  return `${Date.now()}-${originalBaseName}${extension}`;
};

const packagingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, packagingUploadDir);
  },

  filename: (_req, file, cb) => {
    cb(null, createFilename(file));
  },
});

const brandStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, brandUploadDir);
  },

  filename: (_req, file, cb) => {
    cb(null, createFilename(file));
  },
});

const upload = multer({
  storage: packagingStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

const uploadBrandLogo = multer({
  storage: brandStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

module.exports = upload;
module.exports.upload = upload;
module.exports.uploadBrandLogo = uploadBrandLogo;