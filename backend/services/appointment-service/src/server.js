const app = require('./app');
const dotenv = require('dotenv');
const ConsulService = require('./shared/consul-service');
const KafkaService = require('./shared/kafka-service');

dotenv.config();

const PORT = process.env.PORT || 3004;
const SERVICE_NAME = 'appointment-service';

const consul = new ConsulService(SERVICE_NAME, PORT);
const kafka = new KafkaService('appointment-service');

let consulInstanceId = null;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`✅ SERVICE RENDEZ-VOUS DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');

  consulInstanceId = await consul.register();
});

// Fonction d'arrêt gracieux
const gracefulShutdown = async (signal) => {
  console.log(`📥 Signal ${signal} reçu, arrêt gracieux...`);

  try {
    // Déconnexion Kafka
    await kafka.disconnect();
    console.log('✅ Kafka déconnecté');

    // Retirer le service de Consul
    if (consulInstanceId) {
      await consul.deregister(consulInstanceId);
      console.log('✅ Service retiré de Consul');
    }

    // Arrêter le serveur HTTP
    server.close(() => {
      console.log('✅ Serveur HTTP arrêté');

      // Fermer la connexion DB
      require('./config/database').pool.end();
      console.log('✅ Connexions DB fermées');

      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erreur pendant l’arrêt:', error);
    process.exit(1);
  }
};

// Gestion des signaux système
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = server;