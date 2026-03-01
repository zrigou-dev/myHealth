const axios = require('axios');

class PrescriptionService {
  constructor() {
    this.baseURL = process.env.PRESCRIPTION_SERVICE_URL;
  }

  async getPatientPrescriptions(patientId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/prescriptions/patient/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération prescriptions:', error.message);
      return [];
    }
  }

  async getPrescription(prescriptionId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/prescriptions/${prescriptionId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération prescription:', error.message);
      return null;
    }
  }
}

module.exports = new PrescriptionService();