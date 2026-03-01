const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Important: Pour Stripe webhook, on utilise raw body
app.use('/api/billing/payments/webhook', express.raw({ type: 'application/json' }));

// Pour le reste, JSON normal
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/billing/invoices', invoiceRoutes);
app.use('/api/billing/payments', paymentRoutes);
app.use('/api/billing/insurance', insuranceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'billing-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.path 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  res.status(500).json({ 
    error: 'Erreur interne',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;