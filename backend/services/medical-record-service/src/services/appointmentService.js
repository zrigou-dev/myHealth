const axios = require('axios');

class AppointmentService {
  constructor() {
    this.baseURL = process.env.APPOINTMENT_SERVICE_URL;
  }

  async getPatientAppointments(patientId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/appointments/patient/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération rendez-vous:', error.message);
      return [];
    }
  }

  async getAppointment(appointmentId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/appointments/${appointmentId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération rendez-vous:', error.message);
      return null;
    }
  }
}

module.exports = new AppointmentService();