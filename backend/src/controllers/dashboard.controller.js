const db = require("../config/database");
const { success, error } = require("../utils/response");

exports.getDashboardStats = async (req, res) => {
  try {
    const userFilter =
      req.user.role === "admin" ? "" : "WHERE pu.user_id = ?";

    const params = req.user.role === "admin" ? [] : [req.user.id];

    const [[uploads]] = await db.query(
      `SELECT COUNT(*) AS total_uploads FROM packaging_uploads pu ${userFilter}`,
      params
    );

    const [[verifications]] = await db.query(
      `SELECT COUNT(*) AS total_verifications
       FROM verification_results vr
       JOIN packaging_uploads pu ON vr.upload_id = pu.id
       ${userFilter}`,
      params
    );

    const [[reports]] = await db.query(
      `SELECT COUNT(*) AS total_reports
       FROM reports rp
       JOIN verification_results vr ON rp.result_id = vr.id
       JOIN packaging_uploads pu ON vr.upload_id = pu.id
       ${userFilter}`,
      params
    );

    const [[score]] = await db.query(
      `SELECT ROUND(AVG(vr.compliance_score), 2) AS average_score
       FROM verification_results vr
       JOIN packaging_uploads pu ON vr.upload_id = pu.id
       ${userFilter}`,
      params
    );

    const [[ready]] = await db.query(
      `SELECT COUNT(*) AS export_ready
       FROM verification_results vr
       JOIN packaging_uploads pu ON vr.upload_id = pu.id
       ${userFilter ? userFilter + " AND" : "WHERE"} vr.export_status = 'ready'`,
      params
    );

    const [[notReady]] = await db.query(
      `SELECT COUNT(*) AS not_ready
       FROM verification_results vr
       JOIN packaging_uploads pu ON vr.upload_id = pu.id
       ${userFilter ? userFilter + " AND" : "WHERE"} vr.export_status = 'not_ready'`,
      params
    );

    return success(res, "Dashboard stats fetched successfully", {
      total_uploads: uploads.total_uploads,
      total_verifications: verifications.total_verifications,
      total_reports: reports.total_reports,
      average_score: score.average_score || 0,
      export_ready: ready.export_ready,
      not_ready: notReady.not_ready,
    });
  } catch (err) {
    return error(res, "Failed to fetch dashboard stats", 500, err.message);
  }
};