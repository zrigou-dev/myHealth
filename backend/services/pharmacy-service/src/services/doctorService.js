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
      return {
        id: doctorId,
        first_name: 'Médecin',
        last_name: 'Inconnu'
      };
    }
  }
}

module.exports = new DoctorService();