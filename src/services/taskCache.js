const { redisClient } = require("../config/redis");
const config = require("../config");

// Keys look like: tasks:{orgId}:{assigneeId}:{filters}
// All entries for one assignee share a prefix, so we can invalidate them in one go.

const buildKey = (orgId, assigneeId, query) =>
  `tasks:${orgId}:${assigneeId}:p${query.page}_l${query.limit}` +
  `_s${query.status || "all"}_pr${query.priority || "all"}`;

const get = async (orgId, assigneeId, query) => {
  try {
    const raw = await redisClient.get(buildKey(orgId, assigneeId, query));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const set = async (orgId, assigneeId, query, value) => {
  try {
    await redisClient.set(
      buildKey(orgId, assigneeId, query),
      JSON.stringify(value),
      { EX: config.cacheTtl }
    );
  } catch {}
};

const invalidate = async (orgId, assigneeIds) => {
  try {
    const unique = [...new Set(assigneeIds.filter(Boolean).map(String))];
    for (const id of unique) {
      const keys = await redisClient.keys(`tasks:${orgId}:${id}:*`);
      if (keys.length) await redisClient.del(keys);
    }
  } catch {}
};

module.exports = { get, set, invalidate };
