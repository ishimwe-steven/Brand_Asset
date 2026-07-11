const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "backend");

const folders = [
  "src/config",
  "src/controllers",
  "src/middleware",
  "src/models",
  "src/routes",
  "src/services",
  "src/utils",
  "src/uploads",
];

const files = [
  "src/config/database.js",
  "src/config/jwt.js",
  "src/config/multer.js",

  "src/controllers/auth.controller.js",
  "src/controllers/user.controller.js",
  "src/controllers/upload.controller.js",
  "src/controllers/regulation.controller.js",
  "src/controllers/market.controller.js",
  "src/controllers/category.controller.js",
  "src/controllers/verification.controller.js",
  "src/controllers/report.controller.js",

  "src/middleware/auth.middleware.js",
  "src/middleware/admin.middleware.js",
  "src/middleware/upload.middleware.js",
  "src/middleware/validation.middleware.js",

  "src/models/user.model.js",
  "src/models/category.model.js",
  "src/models/market.model.js",
  "src/models/regulation.model.js",
  "src/models/upload.model.js",
  "src/models/verification.model.js",
  "src/models/report.model.js",

  "src/routes/auth.routes.js",
  "src/routes/user.routes.js",
  "src/routes/upload.routes.js",
  "src/routes/market.routes.js",
  "src/routes/category.routes.js",
  "src/routes/regulation.routes.js",
  "src/routes/verification.routes.js",
  "src/routes/report.routes.js",

  "src/services/ocr.service.js",
  "src/services/vision.service.js",
  "src/services/verification.service.js",
  "src/services/pdf.service.js",
  "src/services/ai.service.js",

  "src/utils/logger.js",
  "src/utils/response.js",

  "src/app.js",
  "src/server.js",
  ".env",
  "package.json",
  "README.md",
];

folders.forEach((folder) => {
  fs.mkdirSync(path.join(root, folder), { recursive: true });
});

files.forEach((file) => {
  const filePath = path.join(root, file);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf8");
  }
});

console.log("✅ Backend folder structure created successfully!");