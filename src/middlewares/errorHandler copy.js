class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      status: err.status,
      code: err.code,
      message: err.message,
    });
  }

  if (err.name === "ValidationError") {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({
      status: 400,
      code: "VALIDATION_ERROR",
      message: first.message,
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      status: 409,
      code: "CONFLICT",
      message: "Resource already exists",
    });
  }

  console.error(err);
  res.status(500).json({
    status: 500,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
};

module.exports = { AppError, errorHandler };
