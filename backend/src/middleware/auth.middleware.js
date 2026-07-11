const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwt");
const { error } = require("../utils/response");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return error(res, "Access denied. No token provided", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded;
    next();
  } catch (err) {
    return error(res, "Invalid or expired token", 401);
  }
};

module.exports = authMiddleware;