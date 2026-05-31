const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Organization = require("../models/Organization");
const RefreshToken = require("../models/RefreshToken");
const { AppError } = require("../middlewares/errorHandler");
const config = require("../config");

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires }
  );

const generateRefreshToken = () => crypto.randomBytes(48).toString("hex");
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const refreshExpiry = () => {
  const days = parseInt(config.jwt.refreshExpires) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();

  await RefreshToken.create({
    user: user._id,
    token: hashToken(refreshToken),
    expiresAt: refreshExpiry(),
  });

  return { accessToken, refreshToken };
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organizationId: user.organizationId,
});

const register = async ({ email, password, name, organizationName }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(409, "CONFLICT", "Email already registered");
  }

  const org = await Organization.create({ name: organizationName });
  const user = await User.create({
    name,
    email,
    password,
    role: "ADMIN",
    organizationId: org._id,
  });

  const tokens = await issueTokens(user);
  return { user: publicUser(user), ...tokens };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  const tokens = await issueTokens(user);
  return { user: publicUser(user), ...tokens };
};

const refresh = async (rawToken) => {
  const stored = await RefreshToken.findOne({ token: hashToken(rawToken) });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid refresh token");
  }

  const user = await User.findById(stored.user);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "User not found");
  }

  stored.revokedAt = new Date();
  await stored.save();

  const tokens = await issueTokens(user);
  return { user: publicUser(user), ...tokens };
};

const logout = async (rawToken) => {
  await RefreshToken.updateOne(
    { token: hashToken(rawToken) },
    { revokedAt: new Date() }
  );
};

module.exports = { register, login, refresh, logout };
