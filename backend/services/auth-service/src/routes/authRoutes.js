const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
  validateRegistration,
  validateLogin,
} = require("../validators/authValidators");

// Public routes
router.post("/register", validateRegistration, authController.register);
router.post("/login", validateLogin, authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

// token verification used by other services
router.get("/verify", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Protected routes
router.get("/me", authenticate, authController.getCurrentUser);
router.put("/me", authenticate, authController.updateMe);
router.post("/users/bulk", authController.getUsersBulk);
router.get("/users/role/:role", authController.getUsersByRole);
router.get("/users/:id", authController.getUserById);

// Admin only routes
router.get("/admin-only", authenticate, authorize("admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

module.exports = router;
