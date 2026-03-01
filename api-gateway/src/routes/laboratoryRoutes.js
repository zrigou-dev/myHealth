const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();

const LABORATORY_SERVICE_URL = process.env.LABORATORY_SERVICE_URL || 'http://laboratory-service:3006';

router.use('/', proxy(LABORATORY_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/laboratory${req.url}`;
  }
}));

module.exports = router;