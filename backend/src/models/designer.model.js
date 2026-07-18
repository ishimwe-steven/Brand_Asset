const pool = require("../config/database");

class Designer {
  // =========================
  // Check whether email exists
  // =========================
  static async emailExists(email) {
    const [rows] = await pool.execute(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
      `,
      [email]
    );

    return rows.length > 0;
  }

  // =========================
  // Create designer account
  // and connect it to company
  // =========================
  static async create({
    companyId,
    name,
    email,
    hashedPassword,
    createdBy,
  }) {
    const connection =
      await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [userResult] =
        await connection.execute(
          `
          INSERT INTO users (
            name,
            email,
            password,
            role,
            status,
            must_change_password
          )
          VALUES (?, ?, ?, 'designer', 'active', 1)
          `,
          [
            name,
            email,
            hashedPassword,
          ]
        );

      const designerUserId =
        userResult.insertId;

      const [membershipResult] =
        await connection.execute(
          `
          INSERT INTO company_members (
            company_id,
            user_id,
            member_role,
            status,
            created_by
          )
          VALUES (?, ?, 'designer', 'active', ?)
          `,
          [
            companyId,
            designerUserId,
            createdBy,
          ]
        );

      await connection.commit();

      return {
        userId: designerUserId,
        membershipId:
          membershipResult.insertId,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // =========================
  // Get all designers
  // belonging to one company
  // =========================
  static async getByCompany(companyId) {
    const [rows] = await pool.execute(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status AS user_status,
        u.must_change_password,
        u.created_at,
        cm.id AS membership_id,
        cm.company_id,
        cm.member_role,
        cm.status AS membership_status,
        cm.created_by,
        cm.created_at AS membership_created_at
      FROM company_members cm
      INNER JOIN users u
        ON u.id = cm.user_id
      WHERE cm.company_id = ?
        AND cm.member_role = 'designer'
      ORDER BY cm.id DESC
      `,
      [companyId]
    );

    return rows;
  }

  // =========================
  // Get designer by user ID
  // =========================
  static async getById(designerId) {
    const [rows] = await pool.execute(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status AS user_status,
        u.must_change_password,
        u.created_at,
        cm.id AS membership_id,
        cm.company_id,
        cm.member_role,
        cm.status AS membership_status,
        cm.created_by,
        cm.created_at AS membership_created_at
      FROM users u
      INNER JOIN company_members cm
        ON cm.user_id = u.id
      WHERE u.id = ?
        AND cm.member_role = 'designer'
      LIMIT 1
      `,
      [designerId]
    );

    return rows[0] || null;
  }

  // =========================
  // Get designer belonging
  // to a specific company
  // =========================
  static async getByIdAndCompany(
    designerId,
    companyId
  ) {
    const [rows] = await pool.execute(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status AS user_status,
        u.must_change_password,
        cm.id AS membership_id,
        cm.company_id,
        cm.member_role,
        cm.status AS membership_status
      FROM users u
      INNER JOIN company_members cm
        ON cm.user_id = u.id
      WHERE u.id = ?
        AND cm.company_id = ?
        AND cm.member_role = 'designer'
      LIMIT 1
      `,
      [
        designerId,
        companyId,
      ]
    );

    return rows[0] || null;
  }

  // =========================
  // Update designer basic info
  // =========================
  static async update(
    designerId,
    {
      name,
      email,
    }
  ) {
    const [result] = await pool.execute(
      `
      UPDATE users
      SET
        name = ?,
        email = ?
      WHERE id = ?
        AND role = 'designer'
      `,
      [
        name,
        email,
        designerId,
      ]
    );

    return result.affectedRows;
  }

  // =========================
  // Enable or disable designer
  // in both tables
  // =========================
  static async updateStatus(
    designerId,
    companyId,
    status
  ) {
    const connection =
      await pool.getConnection();

    const userStatus =
      status === "active"
        ? "active"
        : "inactive";

    const membershipStatus =
      status === "active"
        ? "active"
        : "disabled";

    try {
      await connection.beginTransaction();

      const [membershipResult] =
        await connection.execute(
          `
          UPDATE company_members
          SET status = ?
          WHERE user_id = ?
            AND company_id = ?
            AND member_role = 'designer'
          `,
          [
            membershipStatus,
            designerId,
            companyId,
          ]
        );

      if (
        membershipResult.affectedRows === 0
      ) {
        throw new Error(
          "Designer membership was not found."
        );
      }

      await connection.execute(
        `
        UPDATE users
        SET status = ?
        WHERE id = ?
          AND role = 'designer'
        `,
        [
          userStatus,
          designerId,
        ]
      );

      await connection.commit();

      return {
        userStatus,
        membershipStatus,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // =========================
  // Reset temporary password
  // =========================
  static async resetPassword(
    designerId,
    hashedPassword
  ) {
    const [result] = await pool.execute(
      `
      UPDATE users
      SET
        password = ?,
        must_change_password = 1
      WHERE id = ?
        AND role = 'designer'
      `,
      [
        hashedPassword,
        designerId,
      ]
    );

    return result.affectedRows;
  }

  // =========================
  // Mark password as changed
  // =========================
  static async markPasswordChanged(
    designerId
  ) {
    const [result] = await pool.execute(
      `
      UPDATE users
      SET must_change_password = 0
      WHERE id = ?
        AND role = 'designer'
      `,
      [designerId]
    );

    return result.affectedRows;
  }

  // =========================
  // Count company designers
  // =========================
  static async countByCompany(
    companyId
  ) {
    const [rows] = await pool.execute(
      `
      SELECT
        COUNT(*) AS total,
        SUM(
          CASE
            WHEN cm.status = 'active'
            THEN 1
            ELSE 0
          END
        ) AS active,
        SUM(
          CASE
            WHEN cm.status = 'disabled'
            THEN 1
            ELSE 0
          END
        ) AS disabled
      FROM company_members cm
      WHERE cm.company_id = ?
        AND cm.member_role = 'designer'
      `,
      [companyId]
    );

    return {
      total: Number(
        rows[0]?.total || 0
      ),
      active: Number(
        rows[0]?.active || 0
      ),
      disabled: Number(
        rows[0]?.disabled || 0
      ),
    };
  }
}

module.exports = Designer;