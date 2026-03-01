const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();
const { strictLimiter } = require('../middleware/rateLimiter');

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL;

const appointmentProxy = proxy(APPOINTMENT_SERVICE_URL, {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.user) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
      proxyReqOpts.headers['x-user-role'] = srcReq.user.role;
    }
    return proxyReqOpts;
  },
  proxyReqPathResolver: (req) => {
    return `/api/appointments${req.url}`;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    console.log(`✅ Appointment Service: ${userReq.method} ${userReq.url} -> ${proxyRes.statusCode}`);
    return proxyResData;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('❌ Appointment Service Error:', err.message);
    res.status(503).json({
      error: 'Service rendez-vous temporairement indisponible'
    });
  }
});

router.use('/', strictLimiter, appointmentProxy);

module.exports = router;