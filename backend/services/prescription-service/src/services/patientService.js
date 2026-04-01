const axios = require('axios');

class PatientService {
  constructor() {
    this.baseURL = process.env.PATIENT_SERVICE_URL;
  }

  async getPatient(patientId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/patients/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération patient:', error.message);
      return {
        id: patientId,
        first_name: 'Patient',
        last_name: 'Inconnu'
      };
    }
  }

  async getPatientAllergies(patientId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/patients/${patientId}/allergies`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      return [];
    }
  }
}

module.exports = new PatientService();