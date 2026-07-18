const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user.model");
const Company = require("../models/company.model");
const pool = require("../config/database");
const jwtConfig = require("../config/jwt");

const {
  success,
  error,
} = require("../utils/response");

const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

const validatePassword = (password) => {
  return String(password || "").length >= 8;
};

// =========================
// Register SME / Exporter
// =========================

exports.register = async (req, res) => {
  try {
    const name = String(
      req.body.name || ""
    ).trim();

    const email = normalizeEmail(
      req.body.email
    );

    const password = String(
      req.body.password || ""
    );

    const companyName =
      String(
        req.body.company_name || ""
      ).trim() || null;

    const phone =
      String(
        req.body.phone || ""
      ).trim() || null;

    if (!name || !email || !password || !companyName) {
      return error(
        res,
        "Name, company name, email and password are required",
        400
      );
    }

    if (!validatePassword(password)) {
      return error(
        res,
        "Password must contain at least 8 characters",
        400
      );
    }

    const existingUser =
      await User.findByEmail(email);

    if (existingUser) {
      return error(
        res,
        "Email already registered",
        409
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const userId =
      await User.create({
        name,
        email,
        password: hashedPassword,
        role: "exporter",
        company_name: companyName,
        phone,
      });

    await Company.create({
      owner_user_id: userId,
      company_name: companyName,
      email,
      phone,
    });

    return success(
      res,
      "Account created successfully",
      {
        userId,
      },
      201
    );
  } catch (err) {
    console.error(
      "REGISTER ERROR:",
      err.message
    );

    return error(
      res,
      "Registration failed",
      500,
      err.message
    );
  }
};

// =========================
// Login
// =========================

exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(
      req.body.email
    );

    const password = String(
      req.body.password || ""
    );

    if (!email || !password) {
      return error(
        res,
        "Email and password are required",
        400
      );
    }

    const [rows] =
      await pool.execute(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.password,
          u.role,
          u.company_name,
          u.phone,
          u.status,
          u.must_change_password,
          cm.company_id,
          cm.status AS membership_status,
          cm.member_role
        FROM users u
        LEFT JOIN company_members cm
          ON cm.user_id = u.id
          AND cm.member_role = 'designer'
        WHERE LOWER(u.email) = LOWER(?)
        LIMIT 1
        `,
        [email]
      );

    const user = rows[0];

    if (!user) {
      return error(
        res,
        "Invalid email or password",
        401
      );
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return error(
        res,
        "Invalid email or password",
        401
      );
    }

    if (
      user.status &&
      user.status !== "active"
    ) {
      return error(
        res,
        "Your account is inactive",
        403
      );
    }

    if (
      user.role === "designer" &&
      user.membership_status !== "active"
    ) {
      return error(
        res,
        "Your designer account has been disabled by the SME",
        403
      );
    }

    // Backfill company profiles for exporter accounts created
    // before the company workspace was introduced.
    if (user.role === "exporter" && user.company_name) {
      let company = await Company.getByOwnerUserId(user.id);
      if (!company) {
        const companyId = await Company.create({
          owner_user_id: user.id,
          company_name: user.company_name,
          email: user.email,
          phone: user.phone,
        });
        company = await Company.getById(companyId);
      }
      user.company_id = company.id;
    }

    const mustChangePassword =
      Boolean(
        Number(
          user.must_change_password
        )
      );

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        company_id:
          user.company_id || null,
        must_change_password:
          mustChangePassword,
      },
      jwtConfig.secret,
      {
        expiresIn:
          jwtConfig.expiresIn,
      }
    );

    return success(
      res,
      "Login successful",
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company_name:
            user.company_name,
          phone: user.phone,
          company_id:
            user.company_id || null,
          must_change_password:
            mustChangePassword,
        },
        next_action:
          user.role === "designer" &&
          mustChangePassword
            ? "change_password"
            : "dashboard",
      }
    );
  } catch (err) {
    console.error(
      "LOGIN ERROR:",
      err.message
    );

    return error(
      res,
      "Login failed",
      500,
      err.message
    );
  }
};

// =========================
// Profile
// =========================

exports.profile = async (req, res) => {
  try {
    const userId = Number(
      req.user?.id
    );

    if (
      !userId ||
      Number.isNaN(userId)
    ) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    const [rows] =
      await pool.execute(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.company_name,
          u.phone,
          u.status,
          u.must_change_password,
          cm.company_id,
          cm.status AS membership_status,
          cm.member_role
        FROM users u
        LEFT JOIN company_members cm
          ON cm.user_id = u.id
          AND cm.member_role = 'designer'
        WHERE u.id = ?
        LIMIT 1
        `,
        [userId]
      );

    const user = rows[0];

    if (!user) {
      return error(
        res,
        "User not found",
        404
      );
    }

    return success(
      res,
      "Profile fetched successfully",
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name:
          user.company_name,
        phone: user.phone,
        status:
          user.status || "active",
        company_id:
          user.company_id || null,
        membership_status:
          user.membership_status ||
          null,
        must_change_password:
          Boolean(
            Number(
              user.must_change_password
            )
          ),
      }
    );
  } catch (err) {
    console.error(
      "PROFILE ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to fetch profile",
      500,
      err.message
    );
  }
};

// =========================
// Change Temporary Password
// =========================

exports.changeTemporaryPassword = async (
  req,
  res
) => {
  try {
    const userId = Number(
      req.user?.id
    );

    const currentPassword =
      String(
        req.body.current_password ||
          ""
      );

    const newPassword =
      String(
        req.body.new_password || ""
      );

    const confirmPassword =
      String(
        req.body.confirm_password ||
          ""
      );

    if (
      !userId ||
      Number.isNaN(userId)
    ) {
      return error(
        res,
        "Authenticated user was not found",
        401
      );
    }

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return error(
        res,
        "Current password, new password and confirmation are required",
        400
      );
    }

    if (
      !validatePassword(
        newPassword
      )
    ) {
      return error(
        res,
        "New password must contain at least 8 characters",
        400
      );
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return error(
        res,
        "Password confirmation does not match",
        400
      );
    }

    const [rows] =
      await pool.execute(
        `
        SELECT
          id,
          password,
          role,
          status,
          must_change_password
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
      );

    const user = rows[0];

    if (!user) {
      return error(
        res,
        "User was not found",
        404
      );
    }

    if (
      user.role !== "designer"
    ) {
      return error(
        res,
        "This action is only available to designers",
        403
      );
    }

    if (
      user.status !== "active"
    ) {
      return error(
        res,
        "Your account is inactive",
        403
      );
    }

    const currentPasswordMatches =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (
      !currentPasswordMatches
    ) {
      return error(
        res,
        "Current password is incorrect",
        401
      );
    }

    const sameAsCurrent =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (sameAsCurrent) {
      return error(
        res,
        "New password must be different from the temporary password",
        400
      );
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    await pool.execute(
      `
      UPDATE users
      SET
        password = ?,
        must_change_password = 0
      WHERE id = ?
        AND role = 'designer'
      `,
      [
        hashedPassword,
        userId,
      ]
    );

    return success(
      res,
      "Password changed successfully",
      {
        must_change_password:
          false,
        next_action:
          "dashboard",
      }
    );
  } catch (err) {
    console.error(
      "CHANGE TEMPORARY PASSWORD ERROR:",
      err.message
    );

    return error(
      res,
      "Failed to change password",
      500,
      err.message
    );
  }
};
