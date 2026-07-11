const tesseract = require("node-tesseract-ocr");
const path = require("path");
require("dotenv").config();

const config = {
  lang: "eng",
  oem: 1,
  psm: 6,
  binary: process.env.TESSERACT_PATH || "tesseract",
};

const extractTextFromImage = async (filePath) => {
  try {
    const absolutePath = path.join(__dirname, "..", filePath.replace("/uploads", "uploads"));

    const text = await tesseract.recognize(absolutePath, config);

    return {
      success: true,
      text: text.trim(),
    };
  } catch (error) {
    return {
      success: false,
      text: "",
      error: error.message,
    };
  }
};

module.exports = {
  extractTextFromImage,
};