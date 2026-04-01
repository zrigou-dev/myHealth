const app = require('./app');
const dotenv = require('dotenv');
const ConsulService = require('./shared/consul-service');
dotenv.config();

const PORT = process.env.PORT || 3003;
const SERVICE_NAME = 'doctor-service';

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`✅ DOCTOR SERVICE DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════');
  
  consulInstanceId = await consul.register();
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('HTTP server closed');
    require('./config/database').pool.end();
  });
});



process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  server.close(() => {
    console.log('HTTP server closed');
    require('./config/database').pool.end();
  });
});
module.exports = server;