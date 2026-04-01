const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3015';

console.log('🔧 Notification Service URL:', NOTIFICATION_SERVICE_URL);

router.use('/', proxy(NOTIFICATION_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/notifications${req.url}`;
  }
}));

module.exports = router;