const User = require("../models/User");
const { AppError } = require("../middlewares/errorHandler");

const createUser = async (organizationId, { name, email, password, role }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(409, "CONFLICT", "Email already registered");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    organizationId,
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const listUsers = (organizationId) =>
  User.find({ organizationId }).select("_id name email role");

module.exports = { createUser, listUsers };
