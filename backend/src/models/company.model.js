const pool = require("../config/database");

class Company {
  static async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO companies
       (owner_user_id, company_name, registration_number, email, phone, address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.owner_user_id,
        data.company_name,
        data.registration_number || null,
        data.email || null,
        data.phone || null,
        data.address || null,
      ]
    );

    return result.insertId;
  }

  static async getByOwnerUserId(ownerUserId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM companies
      WHERE owner_user_id = ?
      LIMIT 1
      `,
      [ownerUserId]
    );

    return rows[0] || null;
  }

  static async getById(companyId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM companies
      WHERE id = ?
      LIMIT 1
      `,
      [companyId]
    );

    return rows[0] || null;
  }

  static async updateByOwnerUserId(ownerUserId, data) {
    const [result] = await pool.execute(
      `UPDATE companies
       SET company_name = ?, registration_number = ?, email = ?, phone = ?, address = ?
       WHERE owner_user_id = ?`,
      [
        data.company_name,
        data.registration_number || null,
        data.email || null,
        data.phone || null,
        data.address || null,
        ownerUserId,
      ]
    );

    return result.affectedRows > 0;
  }
}

module.exports = Company;
