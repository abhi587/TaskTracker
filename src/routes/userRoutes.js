const express = require("express");
const { body } = require("express-validator");

const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const userController = require("../controllers/userController");

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorize("ADMIN"),
  [
    body("email").isEmail().withMessage("must be a valid email"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("must be at least 8 characters"),
    body("name").notEmpty().withMessage("is required"),
    body("role")
      .isIn(["ADMIN", "MANAGER", "MEMBER"])
      .withMessage("invalid role"),
  ],
  validate,
  userController.createUser
);

router.get("/", authorize("ADMIN", "MANAGER"), userController.listUsers);

module.exports = router;
