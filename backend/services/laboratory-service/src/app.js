const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const labRequestRoutes = require('./routes/labRequestRoutes');
const labTestRoutes = require('./routes/labTestRoutes');
const labResultRoutes = require('./routes/labResultRoutes'); // ✅ À AJOUTER

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/laboratory/requests', labRequestRoutes);
app.use('/api/laboratory/tests', labTestRoutes);
app.use('/api/laboratory/results', labResultRoutes); // ✅ À AJOUTER

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'laboratory-service',
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