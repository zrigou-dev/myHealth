const axios = require('axios');

class MedicationService {
  constructor() {
    this.baseURL = process.env.MEDICATION_SERVICE_URL || 'http://medication-service:3009';
  }

  async getMedication(medicationId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/medications/${medicationId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération médicament:', error.message);
      return null;
    }
  }

  async checkInteractions(medicationIds) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/medications/interactions/check`,
        { medication_ids: medicationIds }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur vérification interactions:', error.message);
      return { severe: [], warnings: [] };
    }
  }
}

module.exports = new MedicationService();