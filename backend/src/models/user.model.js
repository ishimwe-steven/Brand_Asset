const db = require("../config/database");

const User = {
  create: async (data) => {
    const { name, email, password, role, company_name, phone } = data;

    const [result] = await db.query(
      `INSERT INTO users 
      (name, email, password, role, company_name, phone)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        password,
        role || "exporter",
        company_name || null,
        phone || null,
      ]
    );

    return result.insertId;
  },

  findByEmail: async (email) => {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
  },

  findById: async (id) => {
    const [rows] = await db.query(
      "SELECT id, name, email, role, company_name, phone, created_at FROM users WHERE id = ?",
      [id]
    );
    return rows[0];
  },
};

module.exports = User;