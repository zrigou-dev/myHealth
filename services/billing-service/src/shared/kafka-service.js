const { Kafka, logLevel } = require('kafkajs');

class KafkaService {
  constructor(clientId) {
    this.kafka = new Kafka({
      clientId: clientId,
      brokers: ['kafka:9092'], // Nom du conteneur Docker
      logLevel: logLevel.INFO,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    
    this.producer = this.kafka.producer();
    this.consumers = new Map(); // Stocke les consommateurs par topic
    this.isConnected = false;
  }

  // Initialiser et connecter le producer
  async connectProducer() {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log(`✅ Kafka Producer connecté pour ${this.kafka.clientId}`);
    }
  }

  // Publier un message sur un topic
  async publish(topic, message, key = null) {
    await this.connectProducer();
    
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
    
    console.log(`📤 Message publié sur ${topic}: ${result[0].topicName}[${result[0].partition}]@${result[0].offset}`);
    return result;
  }

  // Créer et connecter un consumer pour un topic
  async createConsumer(groupId, topic, callback) {
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    
    this.consumers.set(`${groupId}-${topic}`, consumer);
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          console.log(`📥 Message reçu de ${topic}[${partition}]@${message.offset}`);
          
          // Décoder le message
          const value = JSON.parse(message.value.toString());
          const key = message.key ? message.key.toString() : null;
          
          // Appeler le callback avec les données
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
  }

  // Arrêter tous les consommateurs
  async disconnect() {
    for (const [key, consumer] of this.consumers) {
      await consumer.disconnect();
      console.log(`Consumer ${key} déconnecté`);
    }
    
    if (this.isConnected) {
      await this.producer.disconnect();
      console.log('Producer déconnecté');
    }
  }
}

module.exports = KafkaService;