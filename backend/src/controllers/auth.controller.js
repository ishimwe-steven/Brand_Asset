const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const jwtConfig = require("../config/jwt");
const { success, error } = require("../utils/response");

exports.register = async (req, res) => {
  try {
    const { name, email, password, company_name, phone } = req.body;

    if (!name || !email || !password) {
      return error(res, "Name, email and password are required", 400);
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return error(res, "Email already registered", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "exporter",
      company_name,
      phone,
    });

    return success(res, "Account created successfully", { userId }, 201);
  } catch (err) {
    return error(res, "Registration failed", 500, err.message);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, "Email and password are required", 400);
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return error(res, "Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return error(res, "Invalid email or password", 401);
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    return success(res, "Login successful", {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company_name: user.company_name,
        phone: user.phone,
      },
    });
  } catch (err) {
    return error(res, "Login failed", 500, err.message);
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return error(res, "User not found", 404);

    return success(res, "Profile fetched successfully", user);
  } catch (err) {
    return error(res, "Failed to fetch profile", 500, err.message);
  }
};