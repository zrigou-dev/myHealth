const app = require('./app');
const dotenv = require('dotenv');
const ConsulService = require('./shared/consul-service');

dotenv.config();

const PORT = process.env.PORT || 3002;
const SERVICE_NAME = 'patient-service';  

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);

const server = app.listen(PORT, async () => {
  console.log(`✅ Patient service running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
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