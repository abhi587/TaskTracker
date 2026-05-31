const userService = require("../services/userService");

const createUser = async (req, res) => {
  const user = await userService.createUser(req.user.organizationId, req.body);
  res.status(201).json(user);
};

const listUsers = async (req, res) => {
  const users = await userService.listUsers(req.user.organizationId);
  res.json(users);
};

module.exports = { createUser, listUsers };
