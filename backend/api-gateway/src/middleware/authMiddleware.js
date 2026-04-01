const jwt = require('jsonwebtoken');
const axios = require('axios');

// Liste des routes publiques (sans authentification)
const publicRoutes = [
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'GET', path: '/api/auth/verify' },
  { method: 'GET', path: '/api/doctors/public' },
  { method: 'GET', path: '/api/doctors/search' },
  { method: 'GET', path: '/api/doctors/:id/availability' },
  { method: 'GET', path: '/api/health' }
];

// Middleware d'authentification
const authenticate = async (req, res, next) => {
  try {
    // Vérifier si la route est publique
    const isPublicRoute = publicRoutes.some(route => {
      if (route.method !== req.method) return false;
      if (route.path.includes(':')) {
        // Route avec paramètre (ex: /api/doctors/:id/public)
        const pattern = route.path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(req.path);
      }
      return req.path.startsWith(route.path);
    });

    if (isPublicRoute) {
      return next();
    }

    // Vérifier le token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token manquant',
        message: 'Veuillez vous authentifier'
      });
    }

    const token = authHeader.split(' ')[1];

    // Vérifier le token avec le service d'auth
    const authServiceUrl = process.env.AUTH_SERVICE_URL;
    const response = await axios.get(`${authServiceUrl}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Ajouter les infos utilisateur à la requête
    req.user = response.data.user;
    
    // Ajouter le token dans les headers pour les services en aval
    req.headers['x-user-id'] = req.user.id;
    req.headers['x-user-role'] = req.user.role;
    
    next();
  } catch (error) {
    console.error('❌ Erreur authentification:', error.message);
    return res.status(401).json({ 
      error: 'Token invalide ou expiré',
      message: 'Veuillez vous reconnecter'
    });
  }
};

// Middleware d'autorisation par rôle
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Accès interdit',
        message: `Rôle ${req.user.role} non autorisé. Rôles requis: ${roles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  publicRoutes
};