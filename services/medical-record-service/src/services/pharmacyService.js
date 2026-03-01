const axios = require('axios');

class PharmacyService {
  constructor() {
    this.baseURL = process.env.PHARMACY_SERVICE_URL;
  }

  async getPatientDispensations(patientId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/pharmacy/dispensations/patient/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupérations délivrances:', error.message);
      return [];
    }
  }

  async getMedicationInfo(medicationId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/pharmacy/medications/${medicationId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération médicament:', error.message);
      return null;
    }
  }
}

module.exports = new PharmacyService();