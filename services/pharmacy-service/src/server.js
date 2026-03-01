const app = require('./app');
const dotenv = require('dotenv');
const cron = require('node-cron');
const Prescription = require('./models/Prescription');
const Stock = require('./models/Stock');

dotenv.config();

const PORT = process.env.PORT || 3007;

// Tâches planifiées
cron.schedule('0 0 * * *', async () => { // Tous les jours à minuit
  console.log('🔍 Vérification des prescriptions expirées...');
  const expired = await Prescription.checkExpiredPrescriptions();
  console.log(`✅ ${expired.length} prescriptions expirées`);

  console.log('🔍 Vérification des stocks...');
  // La vérification est déjà faite dans les modèles
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log(`💊 SERVICE PHARMACIE DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
});