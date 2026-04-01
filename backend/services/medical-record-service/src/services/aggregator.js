const axios = require('axios');

class MedicalDataAggregator {
  constructor() {
    this.services = {
      patient: process.env.PATIENT_SERVICE_URL,
      doctor: process.env.DOCTOR_SERVICE_URL,
      appointment: process.env.APPOINTMENT_SERVICE_URL,
      laboratory: process.env.LABORATORY_SERVICE_URL,
      pharmacy: process.env.PHARMACY_SERVICE_URL,
      prescription: process.env.PRESCRIPTION_SERVICE_URL
    };
  }

  // Agrégation complète du dossier patient
  async aggregateFullRecord(patientId, token) {
    try {
      const [
        patientInfo,
        appointments,
        labResults,
        prescriptions,
        dispensations
      ] = await Promise.all([
        this.getPatientInfo(patientId, token),
        this.getAppointments(patientId, token),
        this.getLabResults(patientId, token),
        this.getPrescriptions(patientId, token),
        this.getDispensations(patientId, token)
      ]);

      return {
        patient: patientInfo,
        appointments: appointments || [],
        laboratory: labResults || [],
        prescriptions: prescriptions || [],
        dispensations: dispensations || []
      };
    } catch (error) {
      console.error('❌ Erreur agrégation:', error);
      throw error;
    }
  }

  // Récupérer infos patient
  async getPatientInfo(patientId, token) {
    try {
      const response = await axios.get(
        `${this.services.patient}/api/patients/user/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur patient:', error.message);
      return null;
    }
  }

  // Récupérer rendez-vous
  async getAppointments(patientId, token) {
    try {
      const response = await axios.get(
        `${this.services.appointment}/api/appointments/patient/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur appointments:', error.message);
      return [];
    }
  }

  // Récupérer résultats labo
  async getLabResults(patientId, token) {
    try {
      const response = await axios.get(
        `${this.services.laboratory}/api/laboratory/results/patient/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur labo:', error.message);
      return [];
    }
  }

  // Récupérer prescriptions
  async getPrescriptions(patientId, token) {
    try {
      const response = await axios.get(
        `${this.services.prescription}/api/prescriptions/patient/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur prescriptions:', error.message);
      return [];
    }
  }

  // Récupérer délivrances
  async getDispensations(patientId, token) {
    try {
      const response = await axios.get(
        `${this.services.pharmacy}/api/pharmacy/dispensations/patient/${patientId}`,
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur dispensations:', error.message);
      return [];
    }
  }

  // Chronologie des événements médicaux
  async getTimeline(patientId, token) {
    const data = await this.aggregateFullRecord(patientId, token);
    
    const timeline = [];

    // Ajouter les rendez-vous
    if (data.appointments) {
      data.appointments.forEach(apt => {
        timeline.push({
          date: apt.date,
          type: 'appointment',
          title: `Consultation avec Dr. ${apt.doctor_name}`,
          description: apt.reason,
          data: apt
        });
      });
    }

    // Ajouter les résultats labo
    if (data.laboratory) {
      data.laboratory.forEach(lab => {
        timeline.push({
          date: lab.performed_at,
          type: 'laboratory',
          title: `Analyse: ${lab.test_name}`,
          description: `Résultat: ${lab.result_value} ${lab.unit}`,
          data: lab
        });
      });
    }

    // Ajouter les prescriptions
    if (data.prescriptions) {
      data.prescriptions.forEach(pre => {
        timeline.push({
          date: pre.prescription_date,
          type: 'prescription',
          title: 'Nouvelle prescription',
          description: `${pre.items_count} médicament(s)`,
          data: pre
        });
      });
    }

    // Trier par date décroissante
    return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

module.exports = new MedicalDataAggregator();