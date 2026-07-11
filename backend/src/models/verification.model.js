const db = require("../config/database");

const Verification = {
  createResult: async (data) => {
    const {
      upload_id,
      total_rules,
      passed_rules,
      failed_rules,
      compliance_score,
      export_status,
      summary,
    } = data;

    const [result] = await db.query(
      `INSERT INTO verification_results
      (upload_id, total_rules, passed_rules, failed_rules, compliance_score, export_status, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        upload_id,
        total_rules,
        passed_rules,
        failed_rules,
        compliance_score,
        export_status,
        summary,
      ]
    );

    return result.insertId;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT 
      vr.*,
      pu.product_name,
      pu.file_path,
      pu.category_id,
      pu.market_id,
      pc.name AS category_name,
      em.name AS market_name
    FROM verification_results vr
    JOIN packaging_uploads pu ON vr.upload_id = pu.id
    JOIN product_categories pc ON pu.category_id = pc.id
    JOIN export_markets em ON pu.market_id = em.id
    WHERE vr.id = ?`,
      [id]
    );

    return rows[0];
  },

  getHistoryByUser: async (user_id) => {
    const [rows] = await db.query(
      `SELECT 
        vr.*,
        pu.product_name,
        pu.file_path,
        pc.name AS category_name,
        em.name AS market_name
      FROM verification_results vr
      JOIN packaging_uploads pu ON vr.upload_id = pu.id
      JOIN product_categories pc ON pu.category_id = pc.id
      JOIN export_markets em ON pu.market_id = em.id
      WHERE pu.user_id = ?
      ORDER BY vr.id DESC`,
      [user_id]
    );

    return rows;
  },

  getAllHistory: async () => {
    const [rows] = await db.query(
      `SELECT 
        vr.*,
        pu.product_name,
        pu.file_path,
        u.name AS user_name,
        pc.name AS category_name,
        em.name AS market_name
      FROM verification_results vr
      JOIN packaging_uploads pu ON vr.upload_id = pu.id
      JOIN users u ON pu.user_id = u.id
      JOIN product_categories pc ON pu.category_id = pc.id
      JOIN export_markets em ON pu.market_id = em.id
      ORDER BY vr.id DESC`
    );

    return rows;
  },

  createIssue: async (data) => {
    const {
      result_id,
      regulation_id,
      issue_type,
      issue_description,
      recommendation,
      severity,
    } = data;

    const [result] = await db.query(
      `INSERT INTO compliance_issues
      (result_id, regulation_id, issue_type, issue_description, recommendation, severity)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        result_id,
        regulation_id,
        issue_type,
        issue_description,
        recommendation,
        severity || "medium",
      ]
    );

    return result.insertId;
  },

  getIssuesByResult: async (result_id) => {
    const [rows] = await db.query(
      `SELECT 
        ci.*,
        r.rule_name,
        r.requirement,
        r.section
      FROM compliance_issues ci
      JOIN regulations r ON ci.regulation_id = r.id
      WHERE ci.result_id = ?
      ORDER BY ci.id DESC`,
      [result_id]
    );

    return rows;
  },
};

module.exports = Verification;