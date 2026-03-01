const User = require('../models/user');
const { generateTokens, verifyAccessToken } = require('../utils/jwtUtils');
const { validationResult } = require('express-validator');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
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
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Login user
  async login(req, res) {
    try {
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
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
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
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        await User.revokeRefreshToken(refreshToken);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();