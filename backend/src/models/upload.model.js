const db = require("../config/database");

const Upload = {
  create: async (data) => {
    const {
      user_id,
      brand_id,
      category_id,
      market_id,
      product_name,
      file_path,
      file_type,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO packaging_uploads
      (
        user_id,
        brand_id,
        category_id,
        market_id,
        product_name,
        file_path,
        file_type,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
        brand_id,
        category_id,
        market_id,
        product_name || null,
        file_path,
        file_type,
        "pending",
      ]
    );

    return result.insertId;
  },

  getAllByUser: async (user_id) => {
    const [rows] = await db.query(
      `
      SELECT
        pu.*,
        b.brand_name,
        pc.name AS category_name,
        em.name AS market_name
      FROM packaging_uploads pu
      JOIN brands b
        ON pu.brand_id = b.id
      JOIN product_categories pc
        ON pu.category_id = pc.id
      JOIN export_markets em
        ON pu.market_id = em.id
      WHERE pu.user_id = ?
      ORDER BY pu.id DESC
      `,
      [user_id]
    );

    return rows;
  },

  getAll: async () => {
    const [rows] = await db.query(
      `
      SELECT
        pu.*,
        u.name AS user_name,
        b.brand_name,
        pc.name AS category_name,
        em.name AS market_name
      FROM packaging_uploads pu
      JOIN users u
        ON pu.user_id = u.id
      JOIN brands b
        ON pu.brand_id = b.id
      JOIN product_categories pc
        ON pu.category_id = pc.id
      JOIN export_markets em
        ON pu.market_id = em.id
      ORDER BY pu.id DESC
      `
    );

    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `
      SELECT
        pu.*,
        u.name AS user_name,
        b.brand_name,
        b.official_logo_path,
        b.dominant_colours,
        b.logo_metadata,
        pc.name AS category_name,
        em.name AS market_name
      FROM packaging_uploads pu
      JOIN users u
        ON pu.user_id = u.id
      JOIN brands b
        ON pu.brand_id = b.id
      JOIN product_categories pc
        ON pu.category_id = pc.id
      JOIN export_markets em
        ON pu.market_id = em.id
      WHERE pu.id = ?
      `,
      [id]
    );

    return rows[0];
  },

  delete: async (id) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [reportRows] = await connection.query(
        `SELECT rp.report_path
         FROM reports rp
         JOIN verification_results vr ON vr.id = rp.result_id
         WHERE vr.upload_id = ?`,
        [id]
      );

      await connection.query(
        `DELETE rp FROM reports rp
         JOIN verification_results vr ON vr.id = rp.result_id
         WHERE vr.upload_id = ?`,
        [id]
      );
      await connection.query(
        `DELETE ci FROM compliance_issues ci
         JOIN verification_results vr ON vr.id = ci.result_id
         WHERE vr.upload_id = ?`,
        [id]
      );
      await connection.query(
        `DELETE cs FROM correction_suggestions cs
         JOIN verification_results vr ON vr.id = cs.result_id
         WHERE vr.upload_id = ?`,
        [id]
      );
      await connection.query("DELETE FROM detected_assets WHERE upload_id = ?", [id]);
      await connection.query("DELETE FROM brand_asset_checks WHERE upload_id = ?", [id]);
      await connection.query("DELETE FROM verification_results WHERE upload_id = ?", [id]);

      const [result] = await connection.query(
        "DELETE FROM packaging_uploads WHERE id = ?",
        [id]
      );

      await connection.commit();

      return {
        affectedRows: result.affectedRows,
        reportPaths: reportRows.map((report) => report.report_path).filter(Boolean),
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  saveDetectedAsset: async (data) => {
    const {
      upload_id,
      asset_type,
      detected_value,
      confidence,
      status,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO detected_assets
      (
        upload_id,
        asset_type,
        detected_value,
        confidence,
        status
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        upload_id,
        asset_type,
        detected_value ?? null,
        confidence ?? null,
        status ?? "detected",
      ]
    );

    return result.insertId;
  },

  getDetectedAssets: async (upload_id) => {
    const [rows] = await db.query(
      `
      SELECT *
      FROM detected_assets
      WHERE upload_id=?
      ORDER BY id DESC
      `,
      [upload_id]
    );

    return rows;
  },

  clearDetectedAssets: async (upload_id) => {
    const [result] = await db.query(
      `
      DELETE FROM detected_assets
      WHERE upload_id=?
      `,
      [upload_id]
    );

    return result.affectedRows;
  },
};

module.exports = Upload;
