const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();

const MEDICAL_RECORD_SERVICE_URL = process.env.MEDICAL_RECORD_SERVICE_URL || 'http://medical-record-service:3009';

console.log('🔧 Medical Record Service URL:', MEDICAL_RECORD_SERVICE_URL);

const medicalRecordProxy = proxy(MEDICAL_RECORD_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return `/api/medical-records${req.url}`;
  }
});

router.use('/', medicalRecordProxy);

module.exports = router;