const express = require("express");
const { body } = require("express-validator");

const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const taskController = require("../controllers/taskController");

const router = express.Router();

router.use(authenticate);

const futureDate = (value) => {
  if (!value) return true;
  if (new Date(value) <= new Date()) {
    throw new Error("due_date must be a future date");
  }
  return true;
};

router.post(
  "/",
  authorize("ADMIN", "MANAGER"),
  [
    body("title").notEmpty().withMessage("is required"),
    body("projectId").isMongoId().withMessage("must be a valid project id"),
    body("assigneeId").optional().isMongoId().withMessage("must be a valid user id"),
    body("priority").optional().isIn(["LOW", "MEDIUM", "HIGH"]),
    body("dueDate").optional().custom(futureDate),
  ],
  validate,
  taskController.createTask
);

router.get("/", taskController.listTasks);
router.get("/:id", taskController.getTask);

router.patch(
  "/:id",
  authorize("ADMIN", "MANAGER"),
  [
    body("title").optional().notEmpty(),
    body("priority").optional().isIn(["LOW", "MEDIUM", "HIGH"]),
    body("dueDate").optional().custom(futureDate),
  ],
  validate,
  taskController.updateTask
);

// All roles hit this route; the assignee-or-manager rule lives in the service.
router.patch(
  "/:id/status",
  [
    body("status")
      .isIn(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"])
      .withMessage("invalid status"),
  ],
  validate,
  taskController.changeStatus
);

router.delete("/:id", authorize("ADMIN", "MANAGER"), taskController.deleteTask);

module.exports = router;
