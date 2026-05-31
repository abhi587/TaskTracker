const Project = require("../models/Project");

const createProject = (organizationId, { name, description }) =>
  Project.create({ name, description, organizationId });

const listProjects = (organizationId) => Project.find({ organizationId });

module.exports = { createProject, listProjects };
