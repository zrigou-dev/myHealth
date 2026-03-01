const axios = require('axios');

class LaboratoryService {
  constructor() {
    this.baseURL = process.env.LABORATORY_SERVICE_URL;
  }

  async getPatientResults(patientId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/laboratory/results/patient/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération résultats labo:', error.message);
      return [];
    }
  }

  async getResultsByRequest(requestId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/laboratory/results/request/${requestId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération résultats:', error.message);
      return null;
    }
  }
}

module.exports = new LaboratoryService();