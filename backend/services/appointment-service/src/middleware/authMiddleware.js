/**
 * Authentication middleware for the appointment service.
 * Trusts the x-user-* headers injected by the API gateway after it validates
 * the JWT. This avoids redundant auth-service calls on every request (internal
 * microservices trust pattern).
 */
const authenticate = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId || !userRole) {
    return res.status(401).json({ error: 'Authentification requise (headers manquants)' });
  }

  req.user = {
    id: parseInt(userId, 10),
    role: userRole,
    email: req.headers['x-user-email'] || '',
    firstName: req.headers['x-user-firstname'] ? decodeURIComponent(req.headers['x-user-firstname']) : '',
    lastName: req.headers['x-user-lastname'] ? decodeURIComponent(req.headers['x-user-lastname']) : '',
  };

  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Vous n\'avez pas les droits pour accéder à cette ressource' 
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};