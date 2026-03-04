const app = require('./app');
const dotenv = require('dotenv');
const ConsulService = require('./shared/consul-service');

dotenv.config();

const PORT = process.env.PORT || 3006;
const SERVICE_NAME = 'laboratory-service';

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`🔬 SERVICE LABORATOIRE DÉMARRÉ`);
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