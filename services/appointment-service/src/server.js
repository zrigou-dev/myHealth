const app = require('./app');
const dotenv = require('dotenv');
const ConsulService = require('./shared/consul-service');
dotenv.config();

const PORT = process.env.PORT || 3004;
const SERVICE_NAME = 'appointment-service';

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`✅ SERVICE RENDEZ-VOUS DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
  consulInstanceId = await consul.register();
});

// Gestion arrêt gracieux
process.on('SIGTERM', async () => {
  console.log('📥 Signal SIGTERM reçu, arrêt gracieux...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur HTTP arrêté');
    require('./config/database').pool.end();
    console.log('✅ Connexions DB fermées');
  });
});

process.on('SIGINT', async () => {
  console.log('📥 Signal SIGINT reçu, arrêt gracieux...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur HTTP arrêté');
    require('./config/database').pool.end();
    console.log('✅ Connexions DB fermées');
  });
});

module.exports = server;