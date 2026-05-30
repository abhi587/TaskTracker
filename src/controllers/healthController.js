const healthService = require("../services/healthService");

const healthCheck = (req, res) => {
  const data = healthService.getHealthStatus();

  res.status(200).json(data);
};

module.exports = {
  healthCheck,
};