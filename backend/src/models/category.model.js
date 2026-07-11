const db = require("../config/database");

const Category = {
  getAll: async () => {
    const [rows] = await db.query("SELECT * FROM product_categories ORDER BY id DESC");
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query("SELECT * FROM product_categories WHERE id = ?", [id]);
    return rows[0];
  },

  create: async (data) => {
    const { name, description } = data;
    const [result] = await db.query(
      "INSERT INTO product_categories (name, description) VALUES (?, ?)",
      [name, description || null]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { name, description } = data;
    const [result] = await db.query(
      "UPDATE product_categories SET name = ?, description = ? WHERE id = ?",
      [name, description || null, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.query("DELETE FROM product_categories WHERE id = ?", [id]);
    return result.affectedRows;
  },
};

module.exports = Category;