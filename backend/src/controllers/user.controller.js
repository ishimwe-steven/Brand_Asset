const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../config/database");
const { success, error } = require("../utils/response");

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const allowedRoles = ["admin", "exporter", "designer"];

exports.getUsers = async (_req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.company_name, u.phone, u.status,
             u.must_change_password, u.created_at,
             COALESCE(cm.company_id, owned.id) AS company_id,
             COALESCE(member_company.company_name, owned.company_name, u.company_name) AS associated_company
      FROM users u
      LEFT JOIN company_members cm ON cm.user_id = u.id AND cm.member_role = 'designer'
      LEFT JOIN companies member_company ON member_company.id = cm.company_id
      LEFT JOIN companies owned ON owned.owner_user_id = u.id
      ORDER BY u.created_at DESC, u.id DESC
    `);
    const [companies] = await db.query("SELECT id, company_name FROM companies WHERE status = 'active' ORDER BY company_name");
    return success(res, "Users fetched successfully", { users, companies });
  } catch (err) {
    return error(res, "Failed to fetch users", 500, err.message);
  }
};

exports.createUser = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const name = String(req.body.name || "").trim();
    const emailAddress = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = String(req.body.role || "").toLowerCase();
    const phone = String(req.body.phone || "").trim() || null;
    const companyName = String(req.body.company_name || "").trim();
    const companyId = Number(req.body.company_id);

    if (!name || !emailAddress || !allowedRoles.includes(role)) return error(res, "Name, email and a valid role are required", 400);
    if (password.length < 8) return error(res, "Password must contain at least 8 characters", 400);
    if (role === "exporter" && !companyName) return error(res, "Company name is required for an exporter", 400);
    if (role === "designer" && (!companyId || Number.isNaN(companyId))) return error(res, "Company is required for a designer", 400);

    const [existing] = await connection.query("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", [emailAddress]);
    if (existing.length) return error(res, "Email is already registered", 409);

    await connection.beginTransaction();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, password, role, company_name, phone, status, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [name, emailAddress, hashedPassword, role, role === "exporter" ? companyName : null, phone, role === "designer" ? 1 : 0]
    );

    if (role === "exporter") {
      await connection.query(
        "INSERT INTO companies (owner_user_id, company_name, email, phone, status) VALUES (?, ?, ?, ?, 'active')",
        [userResult.insertId, companyName, emailAddress, phone]
      );
    } else if (role === "designer") {
      const [company] = await connection.query("SELECT id FROM companies WHERE id = ? AND status = 'active' LIMIT 1", [companyId]);
      if (!company.length) throw Object.assign(new Error("Selected company was not found"), { statusCode: 400 });
      await connection.query(
        "INSERT INTO company_members (company_id, user_id, member_role, status, created_by) VALUES (?, ?, 'designer', 'active', ?)",
        [companyId, userResult.insertId, req.user.id]
      );
    }

    await connection.commit();
    return success(res, "User created successfully", { id: userResult.insertId }, 201);
  } catch (err) {
    await connection.rollback();
    return error(res, err.message === "Selected company was not found" ? err.message : "Failed to create user", err.statusCode || 500, err.message);
  } finally {
    connection.release();
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = String(req.body.name || "").trim();
    const emailAddress = normalizeEmail(req.body.email);
    const phone = String(req.body.phone || "").trim() || null;
    const companyName = String(req.body.company_name || "").trim() || null;
    if (!id || !name || !emailAddress) return error(res, "Name and email are required", 400);

    const [duplicate] = await db.query("SELECT id FROM users WHERE LOWER(email) = ? AND id <> ? LIMIT 1", [emailAddress, id]);
    if (duplicate.length) return error(res, "Email is already registered", 409);
    const [result] = await db.query("UPDATE users SET name = ?, email = ?, phone = ?, company_name = CASE WHEN role = 'exporter' THEN ? ELSE company_name END WHERE id = ?", [name, emailAddress, phone, companyName, id]);
    if (!result.affectedRows) return error(res, "User not found", 404);
    await db.query("UPDATE companies SET company_name = COALESCE(?, company_name), email = ?, phone = ? WHERE owner_user_id = ?", [companyName, emailAddress, phone, id]);
    return success(res, "User updated successfully");
  } catch (err) {
    return error(res, "Failed to update user", 500, err.message);
  }
};

exports.changeUserStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status || "");
    if (!['active', 'inactive'].includes(status)) return error(res, "Status must be active or inactive", 400);
    if (id === Number(req.user.id) && status === "inactive") return error(res, "You cannot disable your own admin account", 400);
    const [result] = await db.query("UPDATE users SET status = ? WHERE id = ?", [status, id]);
    if (!result.affectedRows) return error(res, "User not found", 404);
    await db.query("UPDATE company_members SET status = ? WHERE user_id = ?", [status === "active" ? "active" : "disabled", id]);
    return success(res, `User ${status === "active" ? "activated" : "disabled"} successfully`);
  } catch (err) {
    return error(res, "Failed to update user status", 500, err.message);
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const temporaryPassword = `Verify@${crypto.randomBytes(4).toString("hex")}`;
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const [result] = await db.query("UPDATE users SET password = ?, must_change_password = CASE WHEN role = 'designer' THEN 1 ELSE 0 END WHERE id = ?", [hashedPassword, id]);
    if (!result.affectedRows) return error(res, "User not found", 404);
    return success(res, "Password reset successfully", { temporary_password: temporaryPassword });
  } catch (err) {
    return error(res, "Failed to reset password", 500, err.message);
  }
};
