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

  /**
   * Auto-assign a patient to a doctor's patient list when they book an appointment.
   * Modifié pour envoyer doctorId directement dans le body (car user_id est scrubbé).
   */
  async assignPatientToDoctor(doctorId, patientId, patientUserId) {
    try {
      await axios.post(
        `${this.baseURL}/api/doctors/patients/assign`,
        { 
          doctorId,
          patientId, 
          notes: 'Auto-assigned on appointment booking' 
        },
        {
          headers: {
            // Un inter-service auth, the patient's context is fine.
            'x-user-id': String(patientUserId),
            'x-user-role': 'patient',
          }
        }
      );
      console.log(`✅ Patient ${patientId} auto-assigned to doctor profile ${doctorId}`);
    } catch (error) {
      console.error('⚠️ Could not auto-assign patient to doctor (non-blocking):', error.message);
    }
  }
}

module.exports = new DoctorService();