import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();

const PORT = Number(process.env.PORT || 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "dist");
const indexPath = path.join(distPath, "index.html");

app.disable("x-powered-by");

if (!fs.existsSync(indexPath)) {
  console.error(
    "Frontend build was not found. Run: npm run build"
  );
}

app.use(
  express.static(distPath, {
    index: false,
    maxAge: "1d",
  })
);

// React Router fallback
app.use((req, res) => {
  if (!fs.existsSync(indexPath)) {
    return res.status(503).send(
      "Frontend build is missing. Run npm install and npm run build."
    );
  }

  return res.sendFile(indexPath);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Mupenzi Packaging Verifier frontend running on port ${PORT}`
  );
});