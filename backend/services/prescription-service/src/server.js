const app = require('./app');
const dotenv = require('dotenv');
const cron = require('node-cron');
const Prescription = require('./models/Prescription');
const ConsulService = require('./shared/consul-service');

dotenv.config();

const PORT = process.env.PORT || 3008;
const SERVICE_NAME = 'prescription-service';

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`📋 SERVICE PRESCRIPTION DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
  
  // Enregistrement dans Consul
  consulInstanceId = await consul.register();
});

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