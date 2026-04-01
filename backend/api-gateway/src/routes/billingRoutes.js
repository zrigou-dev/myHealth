const express = require('express');
const proxy = require('express-http-proxy');
const router = express.Router();

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://billing-service:3005';

console.log('🔧 Billing Service URL:', BILLING_SERVICE_URL);

const billingProxy = proxy(BILLING_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    console.log(`➡️ Proxy Billing: ${req.method} ${req.url} -> /api/billing${req.url}`);
    return `/api/billing${req.url}`;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('❌ Billing proxy error:', err.message);
    res.status(503).json({ 
      error: 'Service facturation indisponible',
      message: 'Veuillez réessayer plus tard'
    });
  }
});

router.use('/', billingProxy);

module.exports = router;