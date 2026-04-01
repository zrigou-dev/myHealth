const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const notificationRoutes = require('./routes/notificationRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/notifications', notificationRoutes);

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