const { validationResult } = require("express-validator");

const { AppError } = require("./errorHandler");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const first = errors.array()[0];
  const field = first.path || first.param;
  const message = field ? `${field}: ${first.msg}` : first.msg;
  next(new AppError(400, "VALIDATION_ERROR", message));
};

module.exports = validate;
