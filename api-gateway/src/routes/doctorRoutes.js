const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();
const { strictLimiter } = require('../middleware/rateLimiter');

const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL;

const doctorProxy = proxy(DOCTOR_SERVICE_URL, {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.user) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
      proxyReqOpts.headers['x-user-role'] = srcReq.user.role;
    }
    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    return `/api/doctors${req.url}`;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    console.log(`✅ Doctor Service: ${userReq.method} ${userReq.url} -> ${proxyRes.statusCode}`);
    return proxyResData;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('❌ Doctor Service Error:', err.message);
    res.status(503).json({
      error: 'Service médecin temporairement indisponible'
    });
  }
});

router.use('/', strictLimiter, doctorProxy);

module.exports = router;