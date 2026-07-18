const db = require("../config/database");
class RegulationSetModel {
  // =========================================================
  // GET ALL REGULATION SETS
  // =========================================================
  static async getAll() {
    const [rows] = await db.query(`
      SELECT
        rs.id,
        rs.market_id,
        rs.category_id,
        rs.title,
        rs.version,
        rs.authority,
        rs.effective_date,
        rs.description,
        rs.document_path,
        rs.original_filename,
        rs.document_type,
        rs.extracted_requirements,
        rs.status,
        rs.processing_error,
        rs.created_by,
        rs.created_at,
        rs.updated_at,

        em.name AS market_name,
        em.code AS market_code,

        pc.name AS category_name,

        u.name AS created_by_name,
        u.email AS created_by_email,

        CASE
          WHEN rs.extracted_requirements IS NULL THEN 0
          WHEN JSON_VALID(rs.extracted_requirements) = 1
            THEN JSON_LENGTH(rs.extracted_requirements)
          ELSE 0
        END AS requirements_count

      FROM regulation_sets rs

      INNER JOIN export_markets em
        ON rs.market_id = em.id

      INNER JOIN product_categories pc
        ON rs.category_id = pc.id

      LEFT JOIN users u
        ON rs.created_by = u.id

      ORDER BY rs.created_at DESC
    `);

    return rows.map((row) => this.formatRow(row));
  }

  // =========================================================
  // GET ONE REGULATION SET BY ID
  // =========================================================
  static async getById(id) {
    const [rows] = await db.query(
      `
      SELECT
        rs.id,
        rs.market_id,
        rs.category_id,
        rs.title,
        rs.version,
        rs.authority,
        rs.effective_date,
        rs.description,
        rs.document_path,
        rs.original_filename,
        rs.document_type,
        rs.extracted_requirements,
        rs.status,
        rs.processing_error,
        rs.created_by,
        rs.created_at,
        rs.updated_at,

        em.name AS market_name,
        em.code AS market_code,
        em.description AS market_description,

        pc.name AS category_name,
        pc.description AS category_description,

        u.name AS created_by_name,
        u.email AS created_by_email,

        CASE
          WHEN rs.extracted_requirements IS NULL THEN 0
          WHEN JSON_VALID(rs.extracted_requirements) = 1
            THEN JSON_LENGTH(rs.extracted_requirements)
          ELSE 0
        END AS requirements_count

      FROM regulation_sets rs

      INNER JOIN export_markets em
        ON rs.market_id = em.id

      INNER JOIN product_categories pc
        ON rs.category_id = pc.id

      LEFT JOIN users u
        ON rs.created_by = u.id

      WHERE rs.id = ?

      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.formatRow(rows[0]);
  }

  // =========================================================
  // CREATE REGULATION SET
  // =========================================================
  static async create(data) {
    const {
      market_id,
      category_id,
      title,
      version,
      authority,
      effective_date,
      description,
      document_path,
      original_filename,
      document_type,
      created_by,
    } = data;

    const [result] = await db.query(
      `
      INSERT INTO regulation_sets (
        market_id,
        category_id,
        title,
        version,
        authority,
        effective_date,
        description,
        document_path,
        original_filename,
        document_type,
        extracted_requirements,
        status,
        processing_error,
        created_by
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        NULL,
        'processing',
        NULL,
        ?
      )
      `,
      [
        market_id,
        category_id,
        title,
        version || null,
        authority,
        effective_date || null,
        description || null,
        document_path,
        original_filename,
        document_type || null,
        created_by || null,
      ]
    );

    return result.insertId;
  }

  // =========================================================
  // UPDATE REGULATION SET INFORMATION
  // =========================================================
  static async update(id, data) {
    const {
      market_id,
      category_id,
      title,
      version,
      authority,
      effective_date,
      description,
    } = data;

    const [result] = await db.query(
      `
      UPDATE regulation_sets
      SET
        market_id = ?,
        category_id = ?,
        title = ?,
        version = ?,
        authority = ?,
        effective_date = ?,
        description = ?
      WHERE id = ?
      `,
      [
        market_id,
        category_id,
        title,
        version || null,
        authority,
        effective_date || null,
        description || null,
        id,
      ]
    );

    return result.affectedRows;
  }

  // =========================================================
  // UPDATE UPLOADED DOCUMENT
  // =========================================================
  static async updateDocument(id, data) {
    const {
      document_path,
      original_filename,
      document_type,
    } = data;

    const [result] = await db.query(
      `
      UPDATE regulation_sets
      SET
        document_path = ?,
        original_filename = ?,
        document_type = ?,
        extracted_requirements = NULL,
        processing_error = NULL,
        status = 'processing'
      WHERE id = ?
      `,
      [
        document_path,
        original_filename,
        document_type || null,
        id,
      ]
    );

    return result.affectedRows;
  }

  // =========================================================
  // SAVE AI-EXTRACTED REQUIREMENTS
  // =========================================================
  static async saveExtractedRequirements(
    id,
    requirements
  ) {
    const safeRequirements = Array.isArray(requirements)
      ? requirements
      : [];

    const requirementsJson =
      JSON.stringify(safeRequirements);

    const [result] = await db.query(
      `
      UPDATE regulation_sets
      SET
        extracted_requirements = ?,
        status = 'active',
        processing_error = NULL
      WHERE id = ?
      `,
      [requirementsJson, id]
    );

    return result.affectedRows;
  }

  // =========================================================
  // MARK AI PROCESSING AS FAILED
  // =========================================================
  static async markProcessingFailed(
    id,
    errorMessage
  ) {
    const [result] = await db.query(
      `
      UPDATE regulation_sets
      SET
        status = 'processing_failed',
        processing_error = ?
      WHERE id = ?
      `,
      [errorMessage || "AI extraction failed.", id]
    );

    return result.affectedRows;
  }

  // =========================================================
  // MARK REGULATION SET AS PROCESSING
  // =========================================================
  static async markAsProcessing(id) {
    const [result] = await db.query(
      `
      UPDATE regulation_sets
      SET
        status = 'processing',
        processing_error = NULL
      WHERE id = ?
      `,
      [id]
    );

    return result.affectedRows;
  }

  // =========================================================
  // UPDATE STATUS
  // =========================================================
  static async updateStatus(id, status) {
    const [result] = await db.query(
      `
      UPDATE regulation_sets
      SET status = ?
      WHERE id = ?
      `,
      [status, id]
    );

    return result.affectedRows;
  }

  // =========================================================
  // DELETE REGULATION SET
  // =========================================================
  static async delete(id) {
    const [result] = await db.query(
      `
      DELETE FROM regulation_sets
      WHERE id = ?
      `,
      [id]
    );

    return result.affectedRows;
  }

  // =========================================================
  // CHECK WHETHER EXPORT MARKET EXISTS
  // =========================================================
  static async marketExists(id) {
    const [rows] = await db.query(
      `
      SELECT id
      FROM export_markets
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return rows.length > 0;
  }

  // =========================================================
  // CHECK WHETHER PRODUCT CATEGORY EXISTS
  // =========================================================
  static async categoryExists(id) {
    const [rows] = await db.query(
      `
      SELECT id
      FROM product_categories
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return rows.length > 0;
  }

  // =========================================================
  // CHECK WHETHER USER EXISTS
  // =========================================================
  static async userExists(id) {
    const [rows] = await db.query(
      `
      SELECT id
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return rows.length > 0;
  }

  // =========================================================
  // CHECK DUPLICATE REGULATION SET
  // =========================================================
  static async duplicateExists({
    market_id,
    category_id,
    title,
    version,
    excludeId = null,
  }) {
    let query = `
      SELECT id
      FROM regulation_sets
      WHERE market_id = ?
        AND category_id = ?
        AND LOWER(title) = LOWER(?)
        AND COALESCE(version, '') = COALESCE(?, '')
    `;

    const values = [
      market_id,
      category_id,
      title,
      version || null,
    ];

    if (excludeId) {
      query += " AND id != ?";
      values.push(excludeId);
    }

    query += " LIMIT 1";

    const [rows] = await db.query(query, values);

    return rows.length > 0;
  }

  // =========================================================
  // GET ACTIVE REGULATION SET BY MARKET AND CATEGORY
  // Used during packaging verification
  // =========================================================
  static async getActiveByMarketAndCategory(
    marketId,
    categoryId
  ) {
    const [rows] = await db.query(
      `
      SELECT
        rs.id,
        rs.market_id,
        rs.category_id,
        rs.title,
        rs.version,
        rs.authority,
        rs.effective_date,
        rs.description,
        rs.document_path,
        rs.original_filename,
        rs.document_type,
        rs.extracted_requirements,
        rs.status,
        rs.created_at,
        rs.updated_at,

        em.name AS market_name,
        em.code AS market_code,

        pc.name AS category_name,

        CASE
          WHEN rs.extracted_requirements IS NULL THEN 0
          WHEN JSON_VALID(rs.extracted_requirements) = 1
            THEN JSON_LENGTH(rs.extracted_requirements)
          ELSE 0
        END AS requirements_count

      FROM regulation_sets rs

      INNER JOIN export_markets em
        ON rs.market_id = em.id

      INNER JOIN product_categories pc
        ON rs.category_id = pc.id

      WHERE rs.market_id = ?
        AND rs.category_id = ?
        AND rs.status = 'active'
        AND rs.extracted_requirements IS NOT NULL

      ORDER BY
        rs.effective_date DESC,
        rs.created_at DESC

      LIMIT 1
      `,
      [marketId, categoryId]
    );

    if (rows.length === 0) {
      return null;
    }

    return this.formatRow(rows[0]);
  }

  // =========================================================
  // GET ALL ACTIVE REGULATION SETS
  // =========================================================
  static async getAllActive() {
    const [rows] = await db.query(`
      SELECT
        rs.id,
        rs.market_id,
        rs.category_id,
        rs.title,
        rs.version,
        rs.authority,
        rs.effective_date,
        rs.description,
        rs.document_path,
        rs.original_filename,
        rs.document_type,
        rs.extracted_requirements,
        rs.status,
        rs.created_at,
        rs.updated_at,

        em.name AS market_name,
        em.code AS market_code,

        pc.name AS category_name,

        CASE
          WHEN rs.extracted_requirements IS NULL THEN 0
          WHEN JSON_VALID(rs.extracted_requirements) = 1
            THEN JSON_LENGTH(rs.extracted_requirements)
          ELSE 0
        END AS requirements_count

      FROM regulation_sets rs

      INNER JOIN export_markets em
        ON rs.market_id = em.id

      INNER JOIN product_categories pc
        ON rs.category_id = pc.id

      WHERE rs.status = 'active'
        AND rs.extracted_requirements IS NOT NULL

      ORDER BY
        em.name ASC,
        pc.name ASC,
        rs.created_at DESC
    `);

    return rows.map((row) => this.formatRow(row));
  }

  // =========================================================
  // COUNT REGULATION SETS BY STATUS
  // Used on admin dashboard
  // =========================================================
  static async countByStatus() {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,

        SUM(
          CASE
            WHEN status = 'active' THEN 1
            ELSE 0
          END
        ) AS active,

        SUM(
          CASE
            WHEN status = 'inactive' THEN 1
            ELSE 0
          END
        ) AS inactive,

        SUM(
          CASE
            WHEN status = 'processing' THEN 1
            ELSE 0
          END
        ) AS processing,

        SUM(
          CASE
            WHEN status = 'processing_failed' THEN 1
            ELSE 0
          END
        ) AS processing_failed

      FROM regulation_sets
    `);

    return {
      total: Number(rows[0]?.total || 0),
      active: Number(rows[0]?.active || 0),
      inactive: Number(rows[0]?.inactive || 0),
      processing: Number(
        rows[0]?.processing || 0
      ),
      processing_failed: Number(
        rows[0]?.processing_failed || 0
      ),
    };
  }

  // =========================================================
  // FORMAT DATABASE ROW
  // Converts extracted_requirements into JavaScript array
  // =========================================================
  static formatRow(row) {
    if (!row) {
      return null;
    }

    let extractedRequirements = [];

    if (Array.isArray(row.extracted_requirements)) {
      extractedRequirements =
        row.extracted_requirements;
    } else if (
      row.extracted_requirements &&
      typeof row.extracted_requirements === "object"
    ) {
      extractedRequirements =
        row.extracted_requirements;
    } else if (
      typeof row.extracted_requirements === "string"
    ) {
      try {
        extractedRequirements = JSON.parse(
          row.extracted_requirements
        );
      } catch (error) {
        console.error(
          "Failed to parse extracted requirements:",
          error.message
        );

        extractedRequirements = [];
      }
    }

    return {
      ...row,
      extracted_requirements:
        extractedRequirements,
      requirements_count: Number(
        row.requirements_count || 0
      ),
    };
  }
}

module.exports = RegulationSetModel;
