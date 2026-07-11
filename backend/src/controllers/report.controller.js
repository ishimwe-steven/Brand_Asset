const path = require("path");
const Verification = require("../models/verification.model");
const Report = require("../models/report.model");
const { generateComplianceReport } = require("../services/pdf.service");
const { success, error } = require("../utils/response");
const Suggestion = require("../models/suggestion.model");
const Reference = require("../models/reference.model");

exports.generateReport = async (req, res) => {
  try {
    const { result_id } = req.body;

    if (!result_id) {
      return error(res, "Result ID is required", 400);
    }

    const result = await Verification.getById(result_id);

    if (!result) {
      return error(res, "Verification result not found", 404);
    }

    const issues = await Verification.getIssuesByResult(result_id);
const suggestions = await Suggestion.getByResultId(result_id);

const reference = await Reference.getByMarketAndCategory(
  result.market_id,
  result.category_id
);

const reportPath = await generateComplianceReport(
  result,
  issues,
  suggestions,
  reference
);
    const reportId = await Report.create(result_id, reportPath);

    return success(res, "PDF report generated successfully", {
      report_id: reportId,
      report_path: reportPath,
    });
  } catch (err) {
    return error(res, "Failed to generate report", 500, err.message);
  }
};

exports.getReports = async (req, res) => {
  try {
    let reports;

    if (req.user.role === "admin") {
      reports = await Report.getAll();
    } else {
      reports = await Report.getAllByUser(req.user.id);
    }

    return success(res, "Reports fetched successfully", reports);
  } catch (err) {
    return error(res, "Failed to fetch reports", 500, err.message);
  }
};

exports.getReport = async (req, res) => {
  try {
    const report = await Report.getById(req.params.id);

    if (!report) {
      return error(res, "Report not found", 404);
    }

    if (req.user.role !== "admin" && report.user_id !== req.user.id) {
      return error(res, "You are not allowed to view this report", 403);
    }

    const issues = await Verification.getIssuesByResult(report.result_id);

    return success(res, "Report fetched successfully", {
      ...report,
      issues,
    });
  } catch (err) {
    return error(res, "Failed to fetch report", 500, err.message);
  }
};

exports.downloadReport = async (req, res) => {
  try {
    const report = await Report.getByResultId(req.params.result_id);

    if (!report) {
      return error(res, "Report not found", 404);
    }

    const filePath = path.join(__dirname, "..", report.report_path);

    return res.download(filePath);
  } catch (err) {
    return error(res, "Failed to download report", 500, err.message);
  }
};