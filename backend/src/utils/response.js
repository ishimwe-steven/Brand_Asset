const success = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const error = (res, message, statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
};

module.exports = { success, error };