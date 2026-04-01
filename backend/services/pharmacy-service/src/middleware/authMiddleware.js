const axios = require('axios');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.split(' ')[1];

    const response = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/api/auth/verify`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    req.user = response.data.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Accès non autorisé',
        required: roles
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};