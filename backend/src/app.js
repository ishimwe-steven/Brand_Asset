const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const categoryRoutes = require("./routes/category.routes");
const marketRoutes = require("./routes/market.routes");
const regulationRoutes = require("./routes/regulation.routes");
const uploadRoutes = require("./routes/upload.routes");
const verificationRoutes = require("./routes/verification.routes");
const reportRoutes = require("./routes/report.routes");
const referenceRoutes = require("./routes/reference.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const brandAssetRoutes = require("./routes/brandAsset.routes");
const brandRoutes = require("./routes/brand.routes");
const designerRoutes = require("./routes/designer.routes");
const regulationSetRoutes = require("./routes/regulationSet.routes");
const companyRoutes = require("./routes/company.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "../uploads"))
);
// Serve legacy uploads created before storage was standardized.
app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "uploads"))
);

app.get("/", (req, res) => {
  res.json({ message: "Brand Asset Compliance API is running..." });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/markets", marketRoutes);
app.use("/api/regulations", regulationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/references", referenceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/brand-assets", brandAssetRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/designers", designerRoutes);
app.use("/api/regulation-sets", regulationSetRoutes);
app.use("/api/companies", companyRoutes);
module.exports = app;
