const app = require('./app');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3004;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════');
  console.log(`✅ SERVICE RENDEZ-VOUS DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
});

// Gestion arrêt gracieux
process.on('SIGTERM', () => {
  console.log('📥 Signal SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur HTTP arrêté');
    require('./config/database').pool.end();
    console.log('✅ Connexions DB fermées');
  });
});

process.on('SIGINT', () => {
  console.log('📥 Signal SIGINT reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur HTTP arrêté');
    require('./config/database').pool.end();
    console.log('✅ Connexions DB fermées');
  });
});

module.exports = server;