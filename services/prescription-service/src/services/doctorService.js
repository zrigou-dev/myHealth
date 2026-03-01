const axios = require('axios');

class DoctorService {
  constructor() {
    this.baseURL = process.env.DOCTOR_SERVICE_URL;
  }

  async getDoctor(doctorId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/doctors/public/${doctorId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération médecin:', error.message);
      return {
        id: doctorId,
        first_name: 'Médecin',
        last_name: 'Inconnu',
        license_number: 'N/A'
      };
    }
  }

  async validateDoctor(doctorId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/doctors/public/${doctorId}`
      );
      return !!response.data;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new DoctorService();