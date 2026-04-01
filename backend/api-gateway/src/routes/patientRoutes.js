const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();
const { strictLimiter } = require('../middleware/rateLimiter');

const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL;

const patientProxy = proxy(PATIENT_SERVICE_URL, {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    // Transmettre les infos utilisateur
    if (srcReq.user) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
      proxyReqOpts.headers['x-user-role'] = srcReq.user.role;
    }
    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    return `/api/patients${req.url}`;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    console.log(`✅ Patient Service: ${userReq.method} ${userReq.url} -> ${proxyRes.statusCode}`);
    return proxyResData;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('❌ Patient Service Error:', err.message);
    res.status(503).json({
      error: 'Service patient temporairement indisponible'
    });
  }
});

router.use('/', strictLimiter, patientProxy);

module.exports = router;