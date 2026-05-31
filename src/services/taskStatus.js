const { AppError } = require("../middlewares/errorHandler");

// TODO -> IN_PROGRESS -> IN_REVIEW -> DONE
// BLOCKED is reachable from any active state. DONE is terminal.
const TRANSITIONS = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["IN_REVIEW", "BLOCKED"],
  IN_REVIEW: ["DONE", "IN_PROGRESS", "BLOCKED"],
  BLOCKED: ["IN_PROGRESS"],
  DONE: [],
};

const assertTransition = (from, to) => {
  if (!TRANSITIONS[from].includes(to)) {
    throw new AppError(
      409,
      "INVALID_STATUS_TRANSITION",
      `Cannot move from ${from} to ${to}`
    );
  }
};

module.exports = { assertTransition };
