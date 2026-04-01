const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

// Proxy vers le service d'authentification
const authProxy = proxy(AUTH_SERVICE_URL, {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    // Ajouter des headers personnalisés si nécessaire
    proxyReqOpts.headers['x-gateway'] = 'myheart-gateway';
    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    // Rediriger vers le bon chemin dans le service auth
    return `/api/auth${req.url}`;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    // Logger la réponse
    console.log(`✅ Auth Service: ${userReq.method} ${userReq.url} -> ${proxyRes.statusCode}`);
    return proxyResData;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('❌ Auth Service Error:', err.message);
    res.status(503).json({
      error: 'Service d\'authentification temporairement indisponible',
      message: 'Veuillez réessayer plus tard'
    });
  }
});

// Appliquer le rate limiter strict sur les routes d'auth
router.use('/', authLimiter, authProxy);

module.exports = router;