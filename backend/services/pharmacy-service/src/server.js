const app = require('./app');
const dotenv = require('dotenv');
const cron = require('node-cron');
const Prescription = require('./models/Prescription');
const Stock = require('./models/Stock');
const ConsulService = require('./shared/consul-service');

dotenv.config();

const PORT = process.env.PORT || 3007;
const SERVICE_NAME = 'pharmacy-service';

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`💊 SERVICE PHARMACIE DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
  
  // Enregistrement dans Consul
  consulInstanceId = await consul.register();

  // Démarrer les tâches planifiées APRÈS l'enregistrement
  console.log('⏰ Initialisation des tâches planifiées...');
});

// Tâches planifiées (conservées telles quelles)
cron.schedule('0 0 * * *', async () => { // Tous les jours à minuit
  console.log('🔍 Vérification des prescriptions expirées...');
  const expired = await Prescription.checkExpiredPrescriptions();
  console.log(`✅ ${expired.length} prescriptions expirées`);

  console.log('🔍 Vérification des stocks...');
  // La vérification est déjà faite dans les modèles
});

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
  console.log('📥 SIGTERM reçu, arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    require('./config/database').pool.end();
  });
});

process.on('SIGINT', async () => {
  console.log('📥 SIGINT reçu (Ctrl+C), arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    require('./config/database').pool.end();
  });
});

module.exports = server;