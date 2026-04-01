const { Kafka, logLevel } = require('kafkajs');

class KafkaService {
  constructor(clientId) {
    this.clientId = clientId;
    this.kafka = new Kafka({
      clientId: clientId,
      brokers: ['kafka:9092'],
      logLevel: logLevel.ERROR, // Réduit les logs
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    
    this.producer = this.kafka.producer();
    this.consumers = new Map();
    this.isProducerConnected = false;
  }

  // Initialiser et connecter le producer
  async connectProducer() {
    if (!this.isProducerConnected) {
      try {
        await this.producer.connect();
        this.isProducerConnected = true;
        console.log(`✅ Kafka Producer connecté pour ${this.clientId}`);
      } catch (error) {
        console.log(`⚠️ Kafka non disponible pour ${this.clientId} - mode dégradé`);
        return false;
      }
    }
    return true;
  }

  // Publier un message sur un topic
  async publish(topic, message, key = null) {
    try {
      const connected = await this.connectProducer();
      if (!connected) {
        console.log(`📤 [SIMULATION] Message pour ${topic}:`, message);
        return { simulated: true };
      }
      
      const result = await this.producer.send({
        topic: topic,
        messages: [
          {
            key: key ? String(key) : undefined,
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ],
      });
      
      console.log(`📤 Message publié sur ${topic}`);
      return result;
    } catch (error) {
      console.error(`❌ Erreur publication sur ${topic}:`, error.message);
      return null;
    }
  }

  // Créer et connecter un consumer pour un topic
  async createConsumer(groupId, topic, callback) {
    try {
      // Vérifier d'abord si Kafka est accessible
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.disconnect();
      
      const consumer = this.kafka.consumer({ groupId, sessionTimeout: 30000 });
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: true });
      
      this.consumers.set(`${groupId}-${topic}`, consumer);
      
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = JSON.parse(message.value.toString());
            const key = message.key ? message.key.toString() : null;
            
            await callback({
              key,
              value,
              offset: message.offset,
              partition,
              timestamp: message.timestamp
            });
          } catch (error) {
            console.error(`❌ Erreur traitement message ${topic}:`, error);
          }
        },
      });
      
      console.log(`✅ Kafka Consumer connecté pour ${groupId} sur ${topic}`);
      return consumer;
    } catch (error) {
      console.log(`⚠️ Impossible de se connecter à Kafka pour ${topic} - mode dégradé`);
      return null;
    }
  }

  // Arrêter tous les consommateurs
  async disconnect() {
    for (const [key, consumer] of this.consumers) {
      try {
        await consumer.disconnect();
        console.log(`Consumer ${key} déconnecté`);
      } catch (error) {
        // Ignorer les erreurs de déconnexion
      }
    }
    
    if (this.isProducerConnected) {
      try {
        await this.producer.disconnect();
        console.log('Producer déconnecté');
      } catch (error) {
        // Ignorer les erreurs
      }
    }
  }
}

module.exports = KafkaService;