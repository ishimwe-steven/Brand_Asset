const db = require("../config/database");

const Suggestion = {
  create: async (data) => {
    const { result_id, asset_type, problem, suggestion, recommended_position } = data;

    const [result] = await db.query(
      `INSERT INTO correction_suggestions
      (result_id, asset_type, problem, suggestion, recommended_position)
      VALUES (?, ?, ?, ?, ?)`,
      [result_id, asset_type, problem, suggestion, recommended_position]
    );

    return result.insertId;
  },

  getByResultId: async (result_id) => {
    const [rows] = await db.query(
      "SELECT * FROM correction_suggestions WHERE result_id = ? ORDER BY id DESC",
      [result_id]
    );

    return rows;
  },

  deleteByResultId: async (result_id) => {
    const [result] = await db.query(
      "DELETE FROM correction_suggestions WHERE result_id = ?",
      [result_id]
    );

    return result.affectedRows;
  },
};

module.exports = Suggestion;