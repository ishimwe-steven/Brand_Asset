const express = require("express");
const cors = require("cors");
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

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("src/uploads"));

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

module.exports = app;