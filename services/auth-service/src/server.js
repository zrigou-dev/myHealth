const app = require('./app');
const dotenv = require('dotenv');

// Importer ConsulService (chemin relatif)
const ConsulService = require('./shared/consul-service');

dotenv.config();

const PORT = process.env.PORT || 3001;
const SERVICE_NAME = 'auth-service';

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`🔐 AUTH SERVICE DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log('═══════════════════════════════════════');
  
  // Enregistrement dans Consul
  consulInstanceId = await consul.register();
});

// Désenregistrement à l'arrêt
process.on('SIGTERM', async () => {
  console.log('📥 Arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});

// Pour Ctrl+C
process.on('SIGINT', async () => {
  console.log('📥 Arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});

module.exports = server;