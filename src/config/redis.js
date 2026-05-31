const redis = require("redis");

// Note: the snippet you shared (redis.createClient(port, host, opts) + .auth())
// is the node-redis v2/v3 callback API. This project uses redis@6, whose API
// replaced that signature. Same Redis Cloud host/port/password, modern API.
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
  password: process.env.REDIS_PASSWORD,
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

const connectRedis = async () => {
  await redisClient.connect();
  console.log("✅ Redis Connected");
};

module.exports = { redisClient, connectRedis };
