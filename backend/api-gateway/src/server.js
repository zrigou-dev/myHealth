const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { globalLimiter } = require('./middleware/rateLimiter');
const { authenticate } = require('./middleware/authMiddleware');
const { morganMiddleware, requestLogger } = require('./middleware/logger');
const { corsOptions } = require('./config/services');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
// Import des routes
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const billingRoutes = require('./routes/billingRoutes');
const laboratoryRoutes = require('./routes/laboratoryRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware globaux
app.use(helmet()); // Sécurité
app.use(cors(corsOptions)); // CORS
app.use(express.json()); // Parse JSON
app.use(morganMiddleware); // Logs HTTP
app.use(requestLogger); // Logger personnalisé
app.use(globalLimiter); // Rate limiting global

// Interactive API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Route de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    gateway: 'API Gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: process.env.AUTH_SERVICE_URL,
      patient: process.env.PATIENT_SERVICE_URL,
      doctor: process.env.DOCTOR_SERVICE_URL,
      appointment: process.env.APPOINTMENT_SERVICE_URL
    }
  });
});

// Routes protégées par authentification
app.use('/api/auth', authRoutes); // Routes d'auth (publiques + privées)
app.use('/api/patients', authenticate, patientRoutes); // Routes patients (protégées)
app.use('/api/doctors', authenticate, doctorRoutes); // Routes docteurs (protégées)
app.use('/api/appointments', authenticate, appointmentRoutes); // Routes rendez-vous (protégées)
app.use('/api/billing', authenticate, billingRoutes);
app.use('/api/laboratory', authenticate, laboratoryRoutes);
app.use('/api/pharmacy', authenticate, pharmacyRoutes);
app.use('/api/prescriptions', authenticate, prescriptionRoutes);
app.use('/api/medical-records', authenticate, medicalRecordRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
// Route pour les informations de l'API
app.get('/', (req, res) => {
  res.json({
    name: 'MyHeart API Gateway',
    version: '1.0.0',
    description: 'Point d\'entrée unique pour les microservices MyHeart',
    endpoints: {
      auth: '/api/auth',
      patients: '/api/patients',
      doctors: '/api/doctors',
      appointments: '/api/appointments',
      health: '/health'
    },
    documentation: 'https://github.com/...'
  });
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.path,
    method: req.method
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur Gateway:', err);
  res.status(500).json({
    error: 'Erreur interne de la gateway',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log(`🌉 API GATEWAY DÉMARRÉE`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════');
  console.log('📡 Services configurés:');
  console.log(`   - Auth: ${process.env.AUTH_SERVICE_URL}`);
  console.log(`   - Patient: ${process.env.PATIENT_SERVICE_URL}`);
  console.log(`   - Doctor: ${process.env.DOCTOR_SERVICE_URL}`);
  console.log(`   - Appointment: ${process.env.APPOINTMENT_SERVICE_URL}`);
  console.log('═══════════════════════════════════════');
});

module.exports = app;