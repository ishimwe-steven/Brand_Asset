const db = require("../config/database");

const Reference = {
  create: async (data) => {
    const { category_id, market_id, title, file_path, description } = data;

    const [result] = await db.query(
      `INSERT INTO reference_packagings
      (category_id, market_id, title, file_path, description)
      VALUES (?, ?, ?, ?, ?)`,
      [category_id, market_id, title, file_path, description || null]
    );

    return result.insertId;
  },

  getAll: async () => {
    const [rows] = await db.query(`
      SELECT 
        rp.*,
        pc.name AS category_name,
        em.name AS market_name
      FROM reference_packagings rp
      JOIN product_categories pc ON rp.category_id = pc.id
      JOIN export_markets em ON rp.market_id = em.id
      ORDER BY rp.id DESC
    `);

    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `
      SELECT 
        rp.*,
        pc.name AS category_name,
        em.name AS market_name
      FROM reference_packagings rp
      JOIN product_categories pc ON rp.category_id = pc.id
      JOIN export_markets em ON rp.market_id = em.id
      WHERE rp.id = ?
      `,
      [id]
    );

    return rows[0];
  },

  getByMarketAndCategory: async (market_id, category_id) => {
    const [rows] = await db.query(
      `
      SELECT * FROM reference_packagings
      WHERE market_id = ? AND category_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [market_id, category_id]
    );

    return rows[0];
  },

  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM reference_packagings WHERE id = ?",
      [id]
    );

    return result.affectedRows;
  },
};

module.exports = Reference;