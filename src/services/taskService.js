const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const { AppError } = require("../middlewares/errorHandler");
const { assertTransition } = require("./taskStatus");
const cache = require("./taskCache");

const createTask = async (user, input) => {
  const project = await Project.findOne({
    _id: input.projectId,
    organizationId: user.organizationId,
  });
  if (!project) {
    throw new AppError(404, "NOT_FOUND", "Project not found");
  }

  if (input.assigneeId) {
    const assignee = await User.findOne({
      _id: input.assigneeId,
      organizationId: user.organizationId,
    });
    if (!assignee) {
      throw new AppError(404, "NOT_FOUND", "Assignee not found");
    }
  }

  const task = await Task.create({
    title: input.title,
    description: input.description,
    priority: input.priority || "MEDIUM",
    project: input.projectId,
    assignee: input.assigneeId || null,
    dueDate: input.dueDate || null,
    organizationId: user.organizationId,
    createdBy: user.id,
  });

  await cache.invalidate(user.organizationId, [task.assignee]);
  return task;
};

const getTask = async (user, taskId) => {
  const task = await Task.findOne({
    _id: taskId,
    organizationId: user.organizationId,
  });
  if (!task) {
    throw new AppError(404, "NOT_FOUND", "Task not found");
  }

  // A MEMBER may only view tasks assigned to them.
  if (user.role === "MEMBER" && task.assignee?.toString() !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You can only view your own tasks");
  }

  return task;
};

const listTasks = async (user, query) => {
  // Members are always narrowed to their own tasks, regardless of any filter passed.
  const assigneeId =
    user.role === "MEMBER" ? user.id : query.assigneeId;

  // Only single-assignee listings are cached (the cache is keyed per assignee).
  if (assigneeId) {
    const cached = await cache.get(user.organizationId, assigneeId, query);
    if (cached) return cached;
  }

  const filter = { organizationId: user.organizationId };
  if (assigneeId) filter.assignee = assigneeId;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;

  const [items, total] = await Promise.all([
    Task.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Task.countDocuments(filter),
  ]);

  const result = {
    data: items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };

  if (assigneeId) {
    await cache.set(user.organizationId, assigneeId, query, result);
  }

  return result;
};

const updateTask = async (user, taskId, input) => {
  const task = await Task.findOne({
    _id: taskId,
    organizationId: user.organizationId,
  });
  if (!task) {
    throw new AppError(404, "NOT_FOUND", "Task not found");
  }

  const oldAssignee = task.assignee;

  if (input.title !== undefined) task.title = input.title;
  if (input.description !== undefined) task.description = input.description;
  if (input.priority !== undefined) task.priority = input.priority;
  if (input.assigneeId !== undefined) task.assignee = input.assigneeId || null;
  if (input.dueDate !== undefined) task.dueDate = input.dueDate || null;

  await task.save();
  await cache.invalidate(user.organizationId, [oldAssignee, task.assignee]);
  return task;
};

const changeStatus = async (user, taskId, status) => {
  const task = await Task.findOne({
    _id: taskId,
    organizationId: user.organizationId,
  });
  if (!task) {
    throw new AppError(404, "NOT_FOUND", "Task not found");
  }

  // Only the assignee, a manager, or an admin can change status.
  const isAssignee = task.assignee?.toString() === user.id;
  const isManager = user.role === "MANAGER" || user.role === "ADMIN";
  if (!isAssignee && !isManager) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only the assignee or a manager can change task status"
    );
  }

  assertTransition(task.status, status);
  task.status = status;
  await task.save();

  await cache.invalidate(user.organizationId, [task.assignee]);
  return task;
};

const deleteTask = async (user, taskId) => {
  const task = await Task.findOne({
    _id: taskId,
    organizationId: user.organizationId,
  });
  if (!task) {
    throw new AppError(404, "NOT_FOUND", "Task not found");
  }

  await task.deleteOne();
  await cache.invalidate(user.organizationId, [task.assignee]);
};

module.exports = {
  createTask,
  getTask,
  listTasks,
  updateTask,
  changeStatus,
  deleteTask,
};
