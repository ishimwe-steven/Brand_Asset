const db = require("../config/database");

/**
 * Converts AI section values into values allowed by the database ENUM:
 * - brand_asset
 * - packaging_compliance
 */
const normalizeSection = (value) => {
  const section = String(value || "")
    .trim()
    .toLowerCase();

  const brandKeywords = [
    "brand",
    "logo",
    "colour",
    "color",
    "identity",
    "placement",
    "visual",
    "trademark",
  ];

  const isBrandAsset = brandKeywords.some(
    (keyword) => section.includes(keyword)
  );

  return isBrandAsset
    ? "brand_asset"
    : "packaging_compliance";
};

/**
 * Converts different mandatory formats into MySQL boolean values.
 */
const normalizeMandatory = (value) => {
  if (
    value === false ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .toLowerCase();

    if (
      normalized === "false" ||
      normalized === "no" ||
      normalized === "optional"
    ) {
      return false;
    }
  }

  return true;
};

const Regulation = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT
        r.*,
        m.name AS market_name,
        c.name AS category_name
      FROM regulations r
      JOIN export_markets m
        ON r.market_id = m.id
      JOIN product_categories c
        ON r.category_id = c.id
      ORDER BY r.id DESC
    `);

    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `
      SELECT
        r.*,
        m.name AS market_name,
        c.name AS category_name
      FROM regulations r
      JOIN export_markets m
        ON r.market_id = m.id
      JOIN product_categories c
        ON r.category_id = c.id
      WHERE r.id = ?
      `,
      [id]
    );

    return rows[0] || null;
  },

  create: async (data) => {
    const {
      market_id,
      category_id,
      section,
      rule_name,
      requirement,
      mandatory,
      recommendation,
    } = data;

    const normalizedSection =
      normalizeSection(section);

    const normalizedMandatory =
      normalizeMandatory(mandatory);

    const [result] = await db.query(
      `
      INSERT INTO regulations
      (
        market_id,
        category_id,
        section,
        rule_name,
        requirement,
        mandatory,
        recommendation
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        market_id,
        category_id,
        normalizedSection,
        rule_name,
        requirement,
        normalizedMandatory,
        recommendation || null,
      ]
    );

    return result.insertId;
  },

  update: async (id, data) => {
    const {
      market_id,
      category_id,
      section,
      rule_name,
      requirement,
      mandatory,
      recommendation,
    } = data;

    const normalizedSection =
      normalizeSection(section);

    const normalizedMandatory =
      normalizeMandatory(mandatory);

    const [result] = await db.query(
      `
      UPDATE regulations
      SET
        market_id = ?,
        category_id = ?,
        section = ?,
        rule_name = ?,
        requirement = ?,
        mandatory = ?,
        recommendation = ?
      WHERE id = ?
      `,
      [
        market_id,
        category_id,
        normalizedSection,
        rule_name,
        requirement,
        normalizedMandatory,
        recommendation || null,
        id,
      ]
    );

    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.query(
      `
      DELETE FROM regulations
      WHERE id = ?
      `,
      [id]
    );

    return result.affectedRows;
  },

  getByMarketAndCategory: async (
    market_id,
    category_id
  ) => {
    const [rows] = await db.query(
      `
      SELECT *
      FROM regulations
      WHERE market_id = ?
        AND category_id = ?
      ORDER BY id DESC
      `,
      [market_id, category_id]
    );

    return rows;
  },

  replaceForRegulationSet: async (
    regulationSet,
    requirements
  ) => {
    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
        DELETE FROM regulations
        WHERE regulation_set_id = ?
        `,
        [regulationSet.id]
      );

      for (const item of requirements) {
        const normalizedSection =
          normalizeSection(
            item.section ||
            item.category ||
            item.type ||
            item.title ||
            item.rule_name
          );

        const ruleName = String(
          item.rule_name ||
          item.asset_key ||
          item.title ||
          "general_requirement"
        ).trim();

        const requirementText = String(
          item.requirement ||
          item.description ||
          item.rule_text ||
          item.title ||
          ""
        ).trim();

        const recommendation =
          item.recommendation
            ? String(
                item.recommendation
              ).trim()
            : null;

        const mandatory =
          normalizeMandatory(
            item.mandatory
          );

        if (!requirementText) {
          console.warn(
            "Skipped regulation requirement without text:",
            item
          );

          continue;
        }

        await connection.query(
          `
          INSERT INTO regulations
          (
            regulation_set_id,
            market_id,
            category_id,
            section,
            rule_name,
            requirement,
            mandatory,
            recommendation
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            regulationSet.id,
            regulationSet.market_id,
            regulationSet.category_id,
            normalizedSection,
            ruleName,
            requirementText,
            mandatory,
            recommendation,
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

module.exports = Regulation;