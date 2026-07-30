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

const percentageChange = (current, previous) => {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
};

exports.getAdminDashboardAnalytics = async (_req, res) => {
  try {
    const [
      [totals], [currentPeriod], [previousPeriod], [trendRows],
      [statusRows], [marketRows], [categoryRows], [recentRows],
    ] = await Promise.all([
      db.query(`SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM companies) AS total_companies,
        (SELECT COUNT(*) FROM verification_results) AS total_verifications,
        (SELECT COUNT(*) FROM regulation_sets WHERE status = 'active') AS active_regulation_sets`),
      db.query(`SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL 30 DAY) AS users_count,
        (SELECT COUNT(*) FROM companies WHERE created_at >= CURRENT_DATE - INTERVAL 30 DAY) AS companies_count,
        (SELECT COUNT(*) FROM verification_results WHERE created_at >= CURRENT_DATE - INTERVAL 30 DAY) AS verifications_count,
        (SELECT COUNT(*) FROM regulation_sets WHERE status = 'active' AND created_at >= CURRENT_DATE - INTERVAL 30 DAY) AS regulations_count`),
      db.query(`SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL 60 DAY AND created_at < CURRENT_DATE - INTERVAL 30 DAY) AS users_count,
        (SELECT COUNT(*) FROM companies WHERE created_at >= CURRENT_DATE - INTERVAL 60 DAY AND created_at < CURRENT_DATE - INTERVAL 30 DAY) AS companies_count,
        (SELECT COUNT(*) FROM verification_results WHERE created_at >= CURRENT_DATE - INTERVAL 60 DAY AND created_at < CURRENT_DATE - INTERVAL 30 DAY) AS verifications_count,
        (SELECT COUNT(*) FROM regulation_sets WHERE status = 'active' AND created_at >= CURRENT_DATE - INTERVAL 60 DAY AND created_at < CURRENT_DATE - INTERVAL 30 DAY) AS regulations_count`),
      db.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COUNT(*) AS total
        FROM verification_results WHERE created_at >= DATE_FORMAT(CURRENT_DATE - INTERVAL 5 MONTH, '%Y-%m-01')
        GROUP BY month_key ORDER BY month_key`),
      db.query(`SELECT export_status AS status, COUNT(*) AS total FROM verification_results GROUP BY export_status`),
      db.query(`SELECT em.id, em.name AS market, ROUND(AVG(vr.compliance_score), 1) AS average_score, COUNT(*) AS total
        FROM verification_results vr JOIN packaging_uploads pu ON pu.id = vr.upload_id
        JOIN export_markets em ON em.id = pu.market_id GROUP BY em.id, em.name ORDER BY average_score DESC`),
      db.query(`SELECT pc.id, pc.name AS category, COUNT(pu.id) AS total
        FROM product_categories pc LEFT JOIN packaging_uploads pu ON pu.category_id = pc.id
        GROUP BY pc.id, pc.name HAVING total > 0 ORDER BY total DESC`),
      db.query(`SELECT vr.id, vr.compliance_score, vr.export_status, vr.created_at,
        pu.product_name, b.brand_name, em.name AS market_name, u.name AS submitted_by,
        COALESCE(company_by_brand.company_name, member_company.company_name, owner_company.company_name, u.company_name) AS company_name
        FROM verification_results vr JOIN packaging_uploads pu ON pu.id = vr.upload_id
        JOIN users u ON u.id = pu.user_id LEFT JOIN brands b ON b.id = pu.brand_id
        LEFT JOIN companies company_by_brand ON company_by_brand.id = b.company_id
        LEFT JOIN company_members cm ON cm.user_id = u.id AND cm.member_role = 'designer'
        LEFT JOIN companies member_company ON member_company.id = cm.company_id
        LEFT JOIN companies owner_company ON owner_company.owner_user_id = u.id
        JOIN export_markets em ON em.id = pu.market_id ORDER BY vr.created_at DESC LIMIT 8`),
    ]);

    const trendMap = new Map(trendRows.map((row) => [row.month_key, Number(row.total)]));
    const verificationTrend = [];
    const today = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      verificationTrend.push({ month: date.toLocaleString('en', { month: 'short' }), month_key: key, total: trendMap.get(key) || 0 });
    }

    return success(res, "Admin dashboard analytics fetched successfully", {
      totals: {
        users: Number(totals[0].total_users), companies: Number(totals[0].total_companies),
        verifications: Number(totals[0].total_verifications), active_regulation_sets: Number(totals[0].active_regulation_sets),
      },
      changes: {
        users: percentageChange(currentPeriod[0].users_count, previousPeriod[0].users_count),
        companies: percentageChange(currentPeriod[0].companies_count, previousPeriod[0].companies_count),
        verifications: percentageChange(currentPeriod[0].verifications_count, previousPeriod[0].verifications_count),
        active_regulation_sets: percentageChange(currentPeriod[0].regulations_count, previousPeriod[0].regulations_count),
      },
      verification_trend: verificationTrend,
      verification_status: statusRows.map((row) => ({ status: row.status, total: Number(row.total) })),
      compliance_by_market: marketRows.map((row) => ({ ...row, average_score: Number(row.average_score), total: Number(row.total) })),
      uploads_by_category: categoryRows.map((row) => ({ ...row, total: Number(row.total) })),
      recent_verifications: recentRows,
    });
  } catch (err) {
    return error(res, "Failed to fetch admin dashboard analytics", 500, err.message);
  }
};
