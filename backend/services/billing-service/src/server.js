const app = require("./app");
const dotenv = require("dotenv");
const ConsulService = require("./shared/consul-service");
dotenv.config();

const PORT = process.env.PORT || 3005;
const SERVICE_NAME = "billing-service";

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);

const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log("═══════════════════════════════════════");
  console.log(`💰 SERVICE FACTURATION DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log("═══════════════════════════════════════");
  
  // ✅ Correction: register() au lieu de registerService()
  consulInstanceId = await consul.register();
});

// ✅ Ajouter la gestion d'arrêt propre
process.on('SIGTERM', async () => {
  console.log('📥 Arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    require('./config/database').pool.end();
  });
});

process.on('SIGINT', async () => {
  console.log('📥 Arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    require('./config/database').pool.end();
  });
});

module.exports = server;