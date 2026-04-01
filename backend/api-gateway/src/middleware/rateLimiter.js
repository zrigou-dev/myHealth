const rateLimit = require('express-rate-limit');

// Rate limiter global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requêtes par IP
  message: {
    error: 'Trop de requêtes',
    message: 'Veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter strict pour les routes sensibles
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: {
    error: 'Trop de tentatives',
    message: 'Veuillez réessayer dans 15 minutes'
  }
});

// Rate limiter pour les routes d'authentification
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 1000, // 1000 tentatives par heure
  message: {
    error: 'Too many requests',
    message: 'Compte temporairement bloqué'
  }
});

module.exports = {
  globalLimiter,
  strictLimiter,
  authLimiter
};