const projectService = require("../services/projectService");

const createProject = async (req, res) => {
  const project = await projectService.createProject(
    req.user.organizationId,
    req.body
  );
  res.status(201).json(project);
};

const listProjects = async (req, res) => {
  const projects = await projectService.listProjects(req.user.organizationId);
  res.json(projects);
};

module.exports = { createProject, listProjects };
