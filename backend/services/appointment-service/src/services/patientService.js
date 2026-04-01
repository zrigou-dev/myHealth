const axios = require('axios');

class PatientService {
  constructor() {
    this.baseURL = process.env.PATIENT_SERVICE_URL;
  }

  async validatePatient(patientId) {
    try {
      // Note: Il faut un token pour accéder au service patient
      // Dans un environnement réel, vous utiliseriez un token de service
      const response = await axios.get(
        `${this.baseURL}/api/patients/${patientId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Patient non trouvé:', error.message);
      return null;
    }
  }

  async getPatientInfo(patientId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/patients/${patientId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération patient:', error.message);
      return null;
    }
  }
}

module.exports = new PatientService();