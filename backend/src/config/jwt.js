require("dotenv").config();

module.exports = {
  secret: process.env.JWT_SECRET || "default_secret_key",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
};