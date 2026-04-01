const express = require('express');
const axios = require('axios');
const router = express.Router();
const { strictLimiter } = require('../middleware/rateLimiter');

const APPOINTMENT_SERVICE_URL = process.env.APPOINTMENT_SERVICE_URL;

/**
 * Forward a request to the appointment-service via axios.
 * This avoids the express-http-proxy body-consumption issue where
 * express.json() reads the stream before the proxy can pipe it.
 * Using req.body (already parsed) is the simplest, most reliable approach.
 */
const forwardToAppointmentService = async (req, res) => {
  try {
    const targetUrl = `${APPOINTMENT_SERVICE_URL}/api/appointments${req.url === '/' ? '' : req.url}`;

    // Copy headers, drop hop-by-hop ones that break proxying
    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['content-length']; // axios will recalculate

    // Inject user context from gateway authentication
    if (req.user) {
      headers['x-user-id']        = String(req.user.id);
      headers['x-user-role']      = req.user.role;
      headers['x-user-email']     = req.user.email     || '';
      headers['x-user-firstname'] = encodeURIComponent(req.user.firstName || req.user.first_name || '');
      headers['x-user-lastname']  = encodeURIComponent(req.user.lastName  || req.user.last_name  || '');
    }

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      data: req.body,           // already parsed by express.json() — no stream issue
      params: req.query,
      validateStatus: () => true, // never throw, always forward the status
    });

    console.log(`✅ Appointment Service: ${req.method} ${req.url} -> ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ Appointment Service Error:', error.message);
    res.status(503).json({ error: 'Service rendez-vous temporairement indisponible' });
  }
};

router.use('/', strictLimiter, forwardToAppointmentService);

module.exports = router;