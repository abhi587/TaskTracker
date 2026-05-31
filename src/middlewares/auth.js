const jwt = require("jsonwebtoken");

const config = require("../config");
const { AppError } = require("./errorHandler");

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing or invalid token"));
  }

  try {
    const payload = jwt.verify(header.slice(7), config.jwt.accessSecret);
    req.user = {
      id: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
  }
  next();
};

module.exports = { authenticate, authorize };
