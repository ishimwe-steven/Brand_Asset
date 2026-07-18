const pool = require("../config/database");

class Brand {
  static async create(data) {
    const sql = `
      INSERT INTO brands (
        company_id,
        brand_name,
        official_logo_path,
        dominant_colours,
        primary_colour,
        secondary_colour,
        logo_metadata,
        slogan,
        trademark,
        preferred_logo_positions,
        minimum_logo_area_percent,
        maximum_logo_area_percent,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      data.company_id,
      data.brand_name,
      data.official_logo_path,
      JSON.stringify(data.dominant_colours || []),
      data.primary_colour || null,
      data.secondary_colour || null,
      JSON.stringify(data.logo_metadata || {}),
      data.slogan || null,
      data.trademark || null,
      JSON.stringify(
        data.preferred_logo_positions || [
          "top_left",
          "top_center",
        ]
      ),
      data.minimum_logo_area_percent ?? 2,
      data.maximum_logo_area_percent ?? 15,
      data.created_by,
    ]);

    return result.insertId;
  }

  static async getByCompanyAndName(
    companyId,
    brandName
  ) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM brands
      WHERE company_id = ?
        AND brand_name = ?
      LIMIT 1
      `,
      [companyId, brandName]
    );

    return rows[0] || null;
  }

  static async getByCompany(companyId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM brands
      WHERE company_id = ?
      ORDER BY id DESC
      `,
      [companyId]
    );

    return rows.map(parseBrandRow);
  }

  static async getById(id) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM brands
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return null;
    }

    return parseBrandRow(rows[0]);
  }

  static async update(brandId, data) {
    const [result] = await pool.execute(
      `
      UPDATE brands
      SET
        brand_name = ?,
        official_logo_path = ?,
        dominant_colours = ?,
        primary_colour = ?,
        secondary_colour = ?,
        logo_metadata = ?,
        slogan = ?,
        trademark = ?,
        preferred_logo_positions = ?,
        minimum_logo_area_percent = ?,
        maximum_logo_area_percent = ?
      WHERE id = ?
      `,
      [
        data.brand_name,
        data.official_logo_path,
        JSON.stringify(data.dominant_colours || []),
        data.primary_colour || null,
        data.secondary_colour || null,
        JSON.stringify(data.logo_metadata || {}),
        data.slogan || null,
        data.trademark || null,
        JSON.stringify(
          data.preferred_logo_positions || [
            "top_left",
            "top_center",
          ]
        ),
        data.minimum_logo_area_percent ?? 2,
        data.maximum_logo_area_percent ?? 15,
        brandId,
      ]
    );

    return result.affectedRows;
  }

  static async updateStatus(
    brandId,
    status
  ) {
    const [result] = await pool.execute(
      `
      UPDATE brands
      SET status = ?
      WHERE id = ?
      `,
      [status, brandId]
    );

    return result.affectedRows;
  }

  static async delete(brandId) {
    const [result] = await pool.execute(
      `
      DELETE FROM brands
      WHERE id = ?
      `,
      [brandId]
    );

    return result.affectedRows;
  }
}

function parseBrandRow(brand) {
  return {
    ...brand,
    dominant_colours: parseJson(
      brand.dominant_colours,
      []
    ),
    logo_metadata: parseJson(
      brand.logo_metadata,
      {}
    ),
    preferred_logo_positions: parseJson(
      brand.preferred_logo_positions,
      []
    ),
  };
}

function parseJson(value, fallback = null) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = Brand;