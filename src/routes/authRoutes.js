const express = require("express");
const { body } = require("express-validator");

const validate = require("../middlewares/validate");
const authController = require("../controllers/authController");

const router = express.Router();

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("must be a valid email"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("must be at least 8 characters"),
    body("name").notEmpty().withMessage("is required"),
    body("organizationName").notEmpty().withMessage("is required"),
  ],
  validate,
  authController.register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("must be a valid email"),
    body("password").notEmpty().withMessage("is required"),
  ],
  validate,
  authController.login
);

router.post(
  "/refresh",
  [body("refreshToken").notEmpty().withMessage("is required")],
  validate,
  authController.refresh
);

router.post(
  "/logout",
  [body("refreshToken").notEmpty().withMessage("is required")],
  validate,
  authController.logout
);

module.exports = router;
