const pool = require("../config/database");

class BrandAsset {
  static async getUploadById(uploadId) {
    const [rows] = await pool.query(
      `
      SELECT id, file_path
      FROM packaging_uploads
      WHERE id = ?
      `,
      [uploadId]
    );

    return rows[0] || null;
  }

  static async saveCheck({
    upload_id,
    asset_type,
    status,
    score,
    detected_value,
    issues,
    recommendation,
  }) {
    const [result] = await pool.query(
      `
      INSERT INTO brand_asset_checks (
        upload_id,
        asset_type,
        status,
        score,
        detected_value,
        issues,
        recommendation
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)

      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        score = VALUES(score),
        detected_value = VALUES(detected_value),
        issues = VALUES(issues),
        recommendation = VALUES(recommendation),
        created_at = CURRENT_TIMESTAMP
      `,
      [
        upload_id,
        asset_type,
        status,
        score,
        detected_value,
        JSON.stringify(issues || []),
        recommendation,
      ]
    );

    return result.insertId;
  }

  static async getByUploadId(uploadId) {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM brand_asset_checks
      WHERE upload_id = ?
      ORDER BY created_at DESC
      `,
      [uploadId]
    );

    return rows;
  }
}

module.exports = BrandAsset;