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

  async getPatientInfo(patientId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/patients/profile/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération infos patient:', error.message);
      return null;
    }
  }

  async validatePatient(patientId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/patients/${patientId}`,
        { headers: { Authorization: token } }
      );
      return !!response.data;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new PatientService();