const db = require("../config/database");

const Market = {
  getAll: async () => {
    const [rows] = await db.query("SELECT * FROM export_markets ORDER BY id DESC");
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query("SELECT * FROM export_markets WHERE id = ?", [id]);
    return rows[0];
  },

  create: async (data) => {
    const { name, code, description } = data;
    const [result] = await db.query(
      "INSERT INTO export_markets (name, code, description) VALUES (?, ?, ?)",
      [name, code, description || null]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { name, code, description } = data;
    const [result] = await db.query(
      "UPDATE export_markets SET name = ?, code = ?, description = ? WHERE id = ?",
      [name, code, description || null, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.query("DELETE FROM export_markets WHERE id = ?", [id]);
    return result.affectedRows;
  },
};

module.exports = Market;