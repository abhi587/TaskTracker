const taskService = require("../services/taskService");

const createTask = async (req, res) => {
  const task = await taskService.createTask(req.user, req.body);
  res.status(201).json(task);
};

const getTask = async (req, res) => {
  const task = await taskService.getTask(req.user, req.params.id);
  res.json(task);
};

const listTasks = async (req, res) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 20, 100),
    status: req.query.status,
    priority: req.query.priority,
    assigneeId: req.query.assigneeId,
  };
  const result = await taskService.listTasks(req.user, query);
  res.json(result);
};

const updateTask = async (req, res) => {
  const task = await taskService.updateTask(req.user, req.params.id, req.body);
  res.json(task);
};

const changeStatus = async (req, res) => {
  const task = await taskService.changeStatus(
    req.user,
    req.params.id,
    req.body.status
  );
  res.json(task);
};

const deleteTask = async (req, res) => {
  await taskService.deleteTask(req.user, req.params.id);
  res.status(204).send();
};

module.exports = {
  createTask,
  getTask,
  listTasks,
  updateTask,
  changeStatus,
  deleteTask,
};
