const Consul = require('consul');

class ConsulService {
  constructor(serviceName, port) {
    this.serviceName = serviceName;
    this.port = port;
    this.consul = new Consul({
      host: 'consul-server',
      port: 8500,
      promisify: true
    });
  }

  async register() {
    try {
      console.log(`📝 Enregistrement de ${this.serviceName} dans Consul...`);
      
      const details = {
        name: this.serviceName,
        address: this.serviceName,
        port: parseInt(this.port),
        check: {
          http: `http://${this.serviceName}:${this.port}/health`,
          interval: '10s',
          timeout: '5s',
          deregistercriticalserviceafter: '30s'
        },
        tags: ['myheart', 'microservice']
      };

      const instanceId = `${this.serviceName}-${Date.now()}`;
      
      // Méthode alternative
      await this.consul.agent.service.register({
        id: instanceId,
        ...details
      });
      
      console.log(`✅ Service ${this.serviceName} enregistré dans Consul (ID: ${instanceId})`);
      return instanceId;
    } catch (error) {
      console.error(`❌ Erreur enregistrement Consul:`, error.message);
      if (error.body) {
        console.error('Détail:', error.body);
      }
      return null;
    }
}

  async deregister(instanceId) {
    try {
      await this.consul.agent.service.deregister(instanceId);
      console.log(`✅ Service ${this.serviceName} désenregistré`);
    } catch (error) {
      console.error(`❌ Erreur désenregistrement:`, error.message);
    }
  }

  async discoverService(serviceName) {
    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: true
      });
      
      if (services && services.length > 0) {
        const service = services[0].Service;
        return `http://${service.Address}:${service.Port}`;
      }
      return null;
    } catch (error) {
      console.error(`❌ Erreur découverte ${serviceName}:`, error.message);
      return null;
    }
  }
}

module.exports = ConsulService;