const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateTokens = (user) => {
  // Access token
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  // Refresh token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const refreshTokenExpires = new Date();
  refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7); // 7 days

  return {
    accessToken,
    refreshToken,
    refreshTokenExpires
  };
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.warn(`[AuthService] JWT Verification failed:`, error.message);
    return null;
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken
};