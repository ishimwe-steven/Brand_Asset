const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateComplianceReport = async (
  result,
  issues = [],
  suggestions = [],
  reference = null
) => {
  const reportsDir = path.join(__dirname, "../uploads/reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const fileName = `compliance-report-${result.id}-${Date.now()}.pdf`;
  const filePath = path.join(reportsDir, fileName);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text("Packaging Compliance Report", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Product Name: ${result.product_name || "N/A"}`);
  doc.text(`Category: ${result.category_name || "N/A"}`);
  doc.text(`Market: ${result.market_name || "N/A"}`);
  doc.text(`Compliance Score: ${result.compliance_score}%`);
  doc.text(`Export Status: ${result.export_status}`);
  doc.text(`Summary: ${result.summary}`);
  doc.moveDown();

  doc.fontSize(16).text("Detected Compliance Issues");
  doc.moveDown();

  if (issues.length === 0) {
    doc.fontSize(12).text("No compliance issues detected.");
  } else {
    issues.forEach((issue, index) => {
      doc.fontSize(12).text(`${index + 1}. ${issue.rule_name || "Issue"}`);
      doc.text(`Problem: ${issue.issue_description}`);
      doc.text(`Recommendation: ${issue.recommendation}`);
      doc.text(`Severity: ${issue.severity}`);
      doc.moveDown();
    });
  }

  doc.addPage();

  doc.fontSize(16).text("AI-Assisted Correction Suggestions");
  doc.moveDown();

  if (suggestions.length === 0) {
    doc.fontSize(12).text("No correction suggestions available.");
  } else {
    suggestions.forEach((item, index) => {
      doc.fontSize(12).text(`${index + 1}. ${item.asset_type}`);
      doc.text(`Problem: ${item.problem}`);
      doc.text(`Suggestion: ${item.suggestion}`);
      doc.text(`Recommended Position: ${item.recommended_position}`);
      doc.moveDown();
    });
  }

  doc.moveDown();

  doc.fontSize(16).text("Reference Packaging Example");
  doc.moveDown();

  if (reference) {
    doc.fontSize(12).text(`Title: ${reference.title}`);
    doc.text(`Description: ${reference.description || "N/A"}`);
    doc.text(`Reference File: ${reference.file_path}`);

    const refImagePath = path.join(__dirname, "..", reference.file_path);

    if (fs.existsSync(refImagePath)) {
      doc.moveDown();
      doc.image(refImagePath, {
        fit: [450, 350],
        align: "center",
      });
    }
  } else {
    doc.fontSize(12).text("No reference packaging uploaded for this category and market.");
  }

  doc.end();

  return `/uploads/reports/${fileName}`;
};

module.exports = { generateComplianceReport };