const { error } = require("../utils/response");

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return error(res, "Admin access only", 403);
  }

  next();
};

module.exports = adminMiddleware;