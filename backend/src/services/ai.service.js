const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const analyzePackaging = async (upload) => {
  const filePath = path.join(__dirname, "..", upload.file_path);

  if (!fs.existsSync(filePath)) {
    throw new Error("Uploaded file not found");
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  const response = await axios.post(`${AI_SERVICE_URL}/analyze`, form, {
    headers: form.getHeaders(),
  });

  return response.data;
};

module.exports = { analyzePackaging };