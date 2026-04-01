const Appointment = require('../models/Appointment');
const DoctorService = require('../services/doctorService');
const PatientService = require('../services/patientService');
const { validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');

const KafkaService = require('../shared/kafka-service');
const kafka = new KafkaService('appointment-service');

class AppointmentController {

  // Créer un rendez-vous
  async createAppointment(req, res) {
    try {

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { doctor_id, appointment_date, start_time, duration_minutes, reason, notes } = req.body;

      // Vérifier que le médecin existe
      const doctor = await DoctorService.validateDoctor(doctor_id);
      if (!doctor) {
        return res.status(404).json({ error: 'Médecin non trouvé' });
      }

      // Vérifier la disponibilité
      const isAvailable = await Appointment.checkAvailability(
        doctor_id,
        appointment_date,
        start_time,
        duration_minutes
      );

      if (!isAvailable) {
        return res.status(409).json({
          error: 'Ce créneau n\'est pas disponible'
        });
      }

      // Créer le rendez-vous
      const appointment = await Appointment.create({
        patient_id: req.user.id,
        doctor_id,
        appointment_date,
        start_time,
        duration_minutes,
        reason,
        notes,
        created_by: req.user.id
      });

      // 🔥 Publier événement Kafka (Optionnel : résilience en cas de panne Kafka)
      try {
        await kafka.publish(
          'appointment.created',
          {
            appointmentId: appointment.id,
            patientId: appointment.patient_id,
            doctorId: appointment.doctor_id,
            date: appointment.appointment_date,
            time: appointment.start_time,
            status: appointment.status,
            timestamp: new Date().toISOString()
          },
          `patient-${appointment.patient_id}`
        );
      } catch (kErr) {
        console.error('⚠️ Kafka Publish Failed (Appointment created nonetheless):', kErr.message);
      }

      // 👤 Auto-assign patient to doctor's patient list (non-blocking)
      if (doctor && doctor.id) {
        // doctor.id = profile ID, req.user.id = both patient profile ID and patient user ID context
        DoctorService.assignPatientToDoctor(doctor.id, req.user.id, req.user.id)
          .catch(err => console.error('⚠️ Auto-assign patient failed:', err.message));
      }

      // Notifier le médecin (Optionnel : résilience)
      DoctorService.notifyDoctorAppointment(doctor_id, {
        appointmentId: appointment.id,
        patientId: req.user.id,
        date: appointment_date,
        time: start_time
      }).catch(err => console.error('⚠️ Erreur notification médecin:', err.message));

      res.status(201).json({
        message: 'Rendez-vous créé avec succès',
        appointment
      });

    } catch (error) {
      console.error('❌ Erreur création rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer mes rendez-vous
  async getMyAppointments(req, res) {
    try {

      const { status, limit } = req.query;
      const appointments = await Appointment.getByPatient(req.user.id, status, limit);

      res.json({
        count: appointments.length,
        appointments
      });

    } catch (error) {
      console.error('❌ Erreur récupération rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer les rendez-vous d'un patient (pour agrégation)
  async getPatientAppointments(req, res) {
    try {
      const { patientId } = req.params;
      const appointments = await Appointment.getByPatient(patientId);
      res.json(appointments);
    } catch (error) {
      console.error('❌ Erreur récupération rendez-vous patient:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer les rendez-vous d'un médecin
  async getDoctorAppointments(req, res) {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
        return res.status(403).json({
          error: 'Vous n\'avez pas accès aux rendez-vous de ce médecin'
        });
      }

      const { date, status } = req.query;
      const appointments = await Appointment.getByDoctor(req.params.doctorId, date, status);

      res.json({
        count: appointments.length,
        appointments
      });

    } catch (error) {
      console.error('❌ Erreur récupération rendez-vous médecin:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Annuler un rendez-vous
  async cancelAppointment(req, res) {
    try {

      const { id } = req.params;
      const { reason } = req.body;

      const appointment = await db.query(
        'SELECT * FROM appointments WHERE id = $1',
        [id]
      );

      if (!appointment.rows[0]) {
        return res.status(404).json({ error: 'Rendez-vous non trouvé' });
      }

      if (
        appointment.rows[0].patient_id !== req.user.id &&
        appointment.rows[0].doctor_id !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({
          error: 'Vous n\'êtes pas autorisé à annuler ce rendez-vous'
        });
      }

      const appointmentDate = moment(appointment.rows[0].appointment_date);
      const now = moment();
      const hoursDiff = appointmentDate.diff(now, 'hours');

      if (hoursDiff < process.env.MIN_ADVANCE_HOURS && req.user.role !== 'admin') {
        return res.status(400).json({
          error: `Les annulations doivent être faites au moins ${process.env.MIN_ADVANCE_HOURS} heures à l'avance`
        });
      }

      const updated = await Appointment.updateStatus(
        id,
        'cancelled',
        req.user.id,
        reason
      );

      res.json({
        message: 'Rendez-vous annulé avec succès',
        appointment: updated
      });

    } catch (error) {
      console.error('❌ Erreur annulation rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Confirmer un rendez-vous
  async confirmAppointment(req, res) {
    try {

      const { id } = req.params;
      const appointment = await Appointment.updateStatus(id, 'confirmed', req.user.id);

      res.json({
        message: 'Rendez-vous confirmé',
        appointment
      });

    } catch (error) {
      console.error('❌ Erreur confirmation rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Rejeter un rendez-vous
  async rejectAppointment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Seulement les médecins peuvent rejeter des rendez-vous' });
      }

      const appointment = await Appointment.updateStatus(id, 'rejected', req.user.id, reason);

      res.json({
        message: 'Rendez-vous rejeté',
        appointment
      });

    } catch (error) {
      console.error('❌ Erreur rejet rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Terminer un rendez-vous
  async completeAppointment(req, res) {
    try {

      const { id } = req.params;
      const appointment = await Appointment.updateStatus(id, 'completed', req.user.id);

      res.json({
        message: 'Rendez-vous marqué comme terminé',
        appointment
      });

    } catch (error) {
      console.error('❌ Erreur completion rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Obtenir les disponibilités d'un médecin
  async getDoctorAvailability(req, res) {
    try {
      const { doctorId } = req.params;
      const { date } = req.query;
      res.json({
        doctorId,
        date: date || moment().format('YYYY-MM-DD'),
        slots: [] // Placeholder
      });
    } catch (error) {
      console.error('❌ Erreur récupération disponibilités:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Déplacer un rendez-vous
  async rescheduleAppointment(req, res) {
    try {
      const { id } = req.params;
      res.json({
        message: 'Fonctionnalité de déplacement bientôt disponible',
        appointmentId: id
      });
    } catch (error) {
      console.error('❌ Erreur déplacement rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Obtenir les statistiques
  async getStats(req, res) {
    try {
      res.json({
        total: 0,
        confirmed: 0,
        pending: 0,
        cancelled: 0
      });
    } catch (error) {
      console.error('❌ Erreur récupération stats:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

}

module.exports = new AppointmentController();