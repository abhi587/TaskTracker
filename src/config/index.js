require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.ACCESS_TOKEN_EXPIRES || "15m",
    refreshExpires: process.env.REFRESH_TOKEN_EXPIRES || "7d",
  },

  cacheTtl: Number(process.env.TASK_CACHE_TTL_SECONDS) || 60,
};
