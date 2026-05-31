const authService = require("../services/authService");

const register = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
};

const login = async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
};

const refresh = async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.json(result);
};

const logout = async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
};

module.exports = { register, login, refresh, logout };
