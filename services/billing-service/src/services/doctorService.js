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
      return null;
    }
  }

  async getDoctorFee(doctorId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/doctors/public/${doctorId}`
      );
      return response.data.consultation_fee || 50;
    } catch (error) {
      console.error('❌ Erreur récupération tarif médecin:', error.message);
      return 50; // Tarif par défaut
    }
  }
}

module.exports = new DoctorService();