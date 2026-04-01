const axios = require('axios');

const authenticate = async (req, res, next) => {
  // ── Internal service-to-service call trust (e.g. appointment-service calling doctor-service)
  const internalUserId = req.headers['x-user-id'];
  const internalUserRole = req.headers['x-user-role'];

  if (internalUserId && internalUserRole) {
    req.user = {
      id: parseInt(internalUserId, 10),
      role: internalUserRole,
      email: req.headers['x-user-email'] || '',
      firstName: req.headers['x-user-firstname'] || '',
      lastName: req.headers['x-user-lastname'] || '',
    };
    return next();
  }

  // ── External request: validate JWT with auth-service
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const response = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    req.user = response.data.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
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