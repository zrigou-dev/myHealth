const { body } = require("express-validator");

const validateRegistration = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),

  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 100 })
    .withMessage("First name cannot exceed 100 characters"),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 100 })
    .withMessage("Last name cannot exceed 100 characters"),

  body("role")
    .optional({ checkFalsy: true })
    .isIn(["patient", "doctor", "admin", "pharmacy", "lab"])
    .withMessage("Invalid role selected"),

  body("phone")
    .optional({ checkFalsy: true })
    .isLength({ min: 10 })
    .withMessage("Please provide a valid phone number (at least 10 digits)"),
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];

module.exports = {
  validateRegistration,
  validateLogin,
};
