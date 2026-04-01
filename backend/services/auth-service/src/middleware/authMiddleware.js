const { verifyAccessToken } = require('../utils/jwtUtils');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      console.warn(`[AuthService] Invalid or expired token for request: ${req.method} ${req.url}`);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error(`[AuthService] Authentication error:`, error.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'You do not have permission to access this resource' 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};