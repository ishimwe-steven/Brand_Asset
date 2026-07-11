const db = require("../config/database");

const Upload = {
  create: async (data) => {
    const {
      user_id,
      category_id,
      market_id,
      product_name,
      file_path,
      file_type,
    } = data;

    const [result] = await db.query(
      `INSERT INTO packaging_uploads 
      (user_id, category_id, market_id, product_name, file_path, file_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        category_id,
        market_id,
        product_name || null,
        file_path,
        file_type,
        "pending",
      ]
    );

    return result.insertId;
  },

  getAllByUser: async (user_id) => {
    const [rows] = await db.query(
      `SELECT 
        pu.*,
        pc.name AS category_name,
        em.name AS market_name
      FROM packaging_uploads pu
      JOIN product_categories pc ON pu.category_id = pc.id
      JOIN export_markets em ON pu.market_id = em.id
      WHERE pu.user_id = ?
      ORDER BY pu.id DESC`,
      [user_id]
    );

    return rows;
  },

  getAll: async () => {
    const [rows] = await db.query(
      `SELECT 
        pu.*,
        u.name AS user_name,
        pc.name AS category_name,
        em.name AS market_name
      FROM packaging_uploads pu
      JOIN users u ON pu.user_id = u.id
      JOIN product_categories pc ON pu.category_id = pc.id
      JOIN export_markets em ON pu.market_id = em.id
      ORDER BY pu.id DESC`
    );

    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT 
        pu.*,
        u.name AS user_name,
        pc.name AS category_name,
        em.name AS market_name
      FROM packaging_uploads pu
      JOIN users u ON pu.user_id = u.id
      JOIN product_categories pc ON pu.category_id = pc.id
      JOIN export_markets em ON pu.market_id = em.id
      WHERE pu.id = ?`,
      [id]
    );

    return rows[0];
  },

  delete: async (id) => {
    const [result] = await db.query("DELETE FROM packaging_uploads WHERE id = ?", [id]);
    return result.affectedRows;
  },
  saveDetectedAsset: async (data) => {
  const { upload_id, asset_type, detected_value, confidence, status } = data;

  const [result] = await db.query(
    `INSERT INTO detected_assets
    (upload_id, asset_type, detected_value, confidence, status)
    VALUES (?, ?, ?, ?, ?)`,
    [
      upload_id,
      asset_type,
      detected_value || null,
      confidence || null,
      status || "detected",
    ]
  );

  return result.insertId;
},

getDetectedAssets: async (upload_id) => {
  const [rows] = await db.query(
    "SELECT * FROM detected_assets WHERE upload_id = ? ORDER BY id DESC",
    [upload_id]
  );

  return rows;
},

clearDetectedAssets: async (upload_id) => {
  const [result] = await db.query(
    "DELETE FROM detected_assets WHERE upload_id = ?",
    [upload_id]
  );

  return result.affectedRows;
},
};

module.exports = Upload;