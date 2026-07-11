const db = require("../config/database");

const Regulation = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT 
        r.*,
        m.name AS market_name,
        c.name AS category_name
      FROM regulations r
      JOIN export_markets m ON r.market_id = m.id
      JOIN product_categories c ON r.category_id = c.id
      ORDER BY r.id DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(`
      SELECT 
        r.*,
        m.name AS market_name,
        c.name AS category_name
      FROM regulations r
      JOIN export_markets m ON r.market_id = m.id
      JOIN product_categories c ON r.category_id = c.id
      WHERE r.id = ?
    `, [id]);

    return rows[0];
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

    const [result] = await db.query(
      `INSERT INTO regulations 
      (market_id, category_id, section, rule_name, requirement, mandatory, recommendation)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        market_id,
        category_id,
        section,
        rule_name,
        requirement,
        mandatory ?? true,
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

    const [result] = await db.query(
      `UPDATE regulations 
       SET market_id = ?, category_id = ?, section = ?, rule_name = ?, requirement = ?, mandatory = ?, recommendation = ?
       WHERE id = ?`,
      [
        market_id,
        category_id,
        section,
        rule_name,
        requirement,
        mandatory ?? true,
        recommendation || null,
        id,
      ]
    );

    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.query("DELETE FROM regulations WHERE id = ?", [id]);
    return result.affectedRows;
  },

  getByMarketAndCategory: async (market_id, category_id) => {
    const [rows] = await db.query(
      "SELECT * FROM regulations WHERE market_id = ? AND category_id = ? ORDER BY id DESC",
      [market_id, category_id]
    );
    return rows;
  },
};

module.exports = Regulation;