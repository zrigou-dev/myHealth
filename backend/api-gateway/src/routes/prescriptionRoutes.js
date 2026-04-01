const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();

const PRESCRIPTION_SERVICE_URL = process.env.PRESCRIPTION_SERVICE_URL || 'http://prescription-service:3008';

console.log('🔧 Prescription Service URL:', PRESCRIPTION_SERVICE_URL);

const prescriptionProxy = proxy(PRESCRIPTION_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/prescriptions${req.url}`;
  }
});

router.use('/', prescriptionProxy);

module.exports = router;