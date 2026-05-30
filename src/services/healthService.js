const getHealthStatus = () => {
  return {
    status: "UP",
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  getHealthStatus,
};