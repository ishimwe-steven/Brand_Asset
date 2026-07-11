const db = require("../config/database");

const Report = {
  create: async (result_id, report_path) => {
    const [result] = await db.query(
      "INSERT INTO reports (result_id, report_path) VALUES (?, ?)",
      [result_id, report_path]
    );

    return result.insertId;
  },

  getByResultId: async (result_id) => {
    const [rows] = await db.query(
      "SELECT * FROM reports WHERE result_id = ? ORDER BY id DESC LIMIT 1",
      [result_id]
    );

    return rows[0];
  },

  getAll: async () => {
    const [rows] = await db.query(`
      SELECT 
        rp.*,
        vr.compliance_score,
        vr.export_status,
        vr.summary,
        pu.product_name,
        pu.file_path,
        u.name AS user_name,
        pc.name AS category_name,
        em.name AS market_name
      FROM reports rp
      JOIN verification_results vr ON rp.result_id = vr.id
      JOIN packaging_uploads pu ON vr.upload_id = pu.id
      JOIN users u ON pu.user_id = u.id
      JOIN product_categories pc ON pu.category_id = pc.id
      JOIN export_markets em ON pu.market_id = em.id
      ORDER BY rp.id DESC
    `);

    return rows;
  },

  getAllByUser: async (user_id) => {
    const [rows] = await db.query(
      `
      SELECT 
        rp.*,
        vr.compliance_score,
        vr.export_status,
        vr.summary,
        pu.product_name,
        pu.file_path,
        pc.name AS category_name,
        em.name AS market_name
      FROM reports rp
      JOIN verification_results vr ON rp.result_id = vr.id
      JOIN packaging_uploads pu ON vr.upload_id = pu.id
      JOIN product_categories pc ON pu.category_id = pc.id
      JOIN export_markets em ON pu.market_id = em.id
      WHERE pu.user_id = ?
      ORDER BY rp.id DESC
      `,
      [user_id]
    );

    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `
      SELECT 
        rp.*,
        vr.compliance_score,
        vr.export_status,
        vr.summary,
        pu.product_name,
        pu.file_path,
        pu.user_id,
        u.name AS user_name,
        pc.name AS category_name,
        em.name AS market_name
      FROM reports rp
      JOIN verification_results vr ON rp.result_id = vr.id
      JOIN packaging_uploads pu ON vr.upload_id = pu.id
      JOIN users u ON pu.user_id = u.id
      JOIN product_categories pc ON pu.category_id = pc.id
      JOIN export_markets em ON pu.market_id = em.id
      WHERE rp.id = ?
      `,
      [id]
    );

    return rows[0];
  },
};

module.exports = Report;