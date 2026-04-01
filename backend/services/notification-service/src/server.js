const app = require('./app');
const dotenv = require('dotenv');
const ConsulService = require('./shared/consul-service');
const KafkaService = require('./shared/kafka-service');

dotenv.config();

const PORT = process.env.PORT || 3015;
const SERVICE_NAME = 'notification-service';

let consulInstanceId = null;
const consul = new ConsulService(SERVICE_NAME, PORT);
const kafka = new KafkaService(SERVICE_NAME);

let kafkaConsumer = null;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log('═══════════════════════════════════════');
  console.log(`📨 SERVICE NOTIFICATION DÉMARRÉ`);
  console.log(`📌 Port: ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/api/notifications/health`);
  console.log('═══════════════════════════════════════');
  
  // Enregistrement dans Consul
  consulInstanceId = await consul.register();
  
  // Démarrer le consommateur Kafka (ne bloque pas le démarrage)
  setTimeout(startKafkaConsumer, 5000);
});

// Fonction pour démarrer le consommateur Kafka
const startKafkaConsumer = async () => {
  try {
    console.log('📡 Connexion à Kafka...');
    
    kafkaConsumer = await kafka.createConsumer(
      'notification-service-group',
      'notification.email',
      async (message) => {
        console.log('📨 Message reçu de Kafka:', message.value);
        
        // Traiter le message selon son type
        const { type, data } = message.value;
        
        switch(type) {
          case 'appointment.created':
            await handleAppointmentCreated(data);
            break;
          case 'lab.result.critical':
            await handleCriticalResult(data);
            break;
          default:
            console.log('Type de message inconnu:', type);
        }
      }
    );
    
    if (kafkaConsumer) {
      console.log('✅ Consommateur Kafka démarré avec succès');
    }
  } catch (error) {
    console.log('⚠️ Le service continue sans Kafka - mode simulation');
  }
};

// Gestionnaires d'événements
async function handleAppointmentCreated(data) {
  console.log('Traitement RDV créé:', data);
  // Logique d'envoi d'email
}

async function handleCriticalResult(data) {
  console.log('Traitement résultat critique:', data);
  // Logique d'envoi de SMS
}

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
  console.log('📥 SIGTERM reçu, arrêt du service...');
  if (consulInstanceId) {
    await consul.deregister(consulInstanceId);
  }
  if (kafkaConsumer) {
    await kafka.disconnect();
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
  if (kafkaConsumer) {
    await kafka.disconnect();
  }
  server.close(() => {
    console.log('✅ Serveur arrêté');
    require('./config/database').pool.end();
  });
});

module.exports = server;