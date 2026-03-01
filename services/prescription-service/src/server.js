const app = require('./app');
const dotenv = require('dotenv');
const cron = require('node-cron');
const Prescription = require('./models/Prescription');

dotenv.config();

const PORT = process.env.PORT || 3008;

// Tâche planifiée pour vérifier les prescriptions expirées (chaque jour à minuit)
cron.schedule('0 0 * * *', async () => {
  console.log('🔍 Vérification des prescriptions expirées...');
  try {
    const expired = await Prescription.checkExpired();
    console.log(`✅ ${expired.length} prescriptions marquées comme expirées`);
  } catch (error) {
    console.error('❌ Erreur vérification prescriptions expirées:', error);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log(`📋 SERVICE PRESCRIPTION DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
});