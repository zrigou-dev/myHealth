const axios = require('axios');

class DoctorService {
  constructor() {
    this.baseURL = process.env.DOCTOR_SERVICE_URL;
  }

  async getDoctorAvailability(doctorId, date) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/doctors/${doctorId}/availability`,
        { params: { date } }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération disponibilités médecin:', error.message);
      return null;
    }
  }

  async getDoctorSchedule(doctorId, dayOfWeek) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/doctors/${doctorId}/schedule/${dayOfWeek}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération horaire médecin:', error.message);
      return null;
    }
  }

  async validateDoctor(doctorId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/doctors/public/${doctorId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Médecin non trouvé:', error.message);
      return null;
    }
  }

  async notifyDoctorAppointment(doctorId, appointmentData) {
    try {
      // Endpoint pour notifier le médecin d'un nouveau rendez-vous
      await axios.post(
        `${this.baseURL}/api/doctors/internal/appointment-notification`,
        {
          doctorId,
          ...appointmentData
        }
      );
    } catch (error) {
      console.error('❌ Erreur notification médecin:', error.message);
    }
  }
}

module.exports = new DoctorService();