const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();

const PHARMACY_SERVICE_URL = process.env.PHARMACY_SERVICE_URL || 'http://pharmacy-service:3007';

console.log('🔧 Pharmacy Service URL:', PHARMACY_SERVICE_URL);

const pharmacyProxy = proxy(PHARMACY_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    console.log(`➡️ Proxy Pharmacy: ${req.method} ${req.url} -> /api/pharmacy${req.url}`);
    return `/api/pharmacy${req.url}`;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('❌ Pharmacy proxy error:', err.message);
    res.status(503).json({ 
      error: 'Service pharmacie indisponible',
      message: 'Veuillez réessayer plus tard'
    });
  }
});

router.use('/', pharmacyProxy);

module.exports = router;