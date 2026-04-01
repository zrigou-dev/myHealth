const app = require('./app');
const dotenv = require('dotenv');
const ConsulService = require('./shared/consul-service');

dotenv.config();

const PORT = process.env.PORT || 3009;
const SERVICE_NAME = 'medical-record-service';

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`📋 SERVICE DOSSIER MÉDICAL DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
  
  // Enregistrement dans Consul
  consulInstanceId = await consul.register();
});

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
  console.log('📥 SIGTERM reçu, arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    // Fermer les connexions aux bases de données
    const { pg, mongo } = require('./config/database');
    if (pg) pg.end();
    if (mongo && mongo.getClient) mongo.getClient().close();
  });
});

process.on('SIGINT', async () => {
  console.log('📥 SIGINT reçu (Ctrl+C), arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    const { pg, mongo } = require('./config/database');
    if (pg) pg.end();
    if (mongo && mongo.getClient) mongo.getClient().close();
  });
});

module.exports = server;