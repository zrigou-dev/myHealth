const User = require('../models/user');
const { generateTokens, verifyAccessToken } = require('../utils/jwtUtils');
const { validationResult } = require('express-validator');
const asyncHandler = require('../shared/asyncHandler');

class AuthController {
  // Register new user
  register = asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email' 
      });
    }

    // Create user
    const newUser = await User.create({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role: role || 'patient',
      phone
    });

    // Generate tokens
    const tokens = generateTokens(newUser);

    // Save refresh token
    await User.saveRefreshToken(
      newUser.id, 
      tokens.refreshToken, 
      tokens.refreshTokenExpires
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
      ...tokens
    });
  });

  // Login user
  login = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Validate password
    const isValidPassword = await User.validatePassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate tokens
    const tokens = generateTokens(user);

    // Save refresh token
    await User.saveRefreshToken(
      user.id, 
      tokens.refreshToken, 
      tokens.refreshTokenExpires
    );

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      message: 'Login successful',
      user,
      ...tokens
    });
  });

  // Refresh access token
  refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Find valid refresh token
    const tokenRecord = await User.findValidRefreshToken(refreshToken);
    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get user
    const user = await User.findById(tokenRecord.user_id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Revoke old refresh token
    await User.revokeRefreshToken(refreshToken);

    // Save new refresh token
    await User.saveRefreshToken(
      user.id, 
      tokens.refreshToken, 
      tokens.refreshTokenExpires
    );

    res.json(tokens);
  });

  // Logout
  logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await User.revokeRefreshToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  });

  // Get current user
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });

  // Update current user
  updateMe = asyncHandler(async (req, res) => {
    const { firstName, lastName, phone } = req.body;
    const user = await User.update(req.user.id, {
      first_name: firstName,
      last_name: lastName,
      phone
    });
    res.json({
      message: 'Profile updated successfully',
      user
    });
  });

  // Get multiple users by ID (Internal use by other services)
  getUsersBulk = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'IDs array required' });
    }
    const users = await User.findByIds(ids);
    res.json(users);
  });

  // Get users by role
  getUsersByRole = asyncHandler(async (req, res) => {
    const { role } = req.params;
    const users = await User.findByRole(role);
    res.json(users);
  });

  // Get single user by ID (Internal use)
  getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
}

module.exports = new AuthController();