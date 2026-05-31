const express = require("express");
const { body } = require("express-validator");

const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const projectController = require("../controllers/projectController");

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorize("ADMIN", "MANAGER"),
  [body("name").notEmpty().withMessage("is required")],
  validate,
  projectController.createProject
);

router.get("/", projectController.listProjects);

module.exports = router;
