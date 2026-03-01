const Appointment = require('../models/Appointment');
const DoctorService = require('../services/doctorService');
const PatientService = require('../services/patientService');
const { validationResult } = require('express-validator');
const moment = require('moment');

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

      // Notifier le médecin (asynchrone, ne pas attendre)
      DoctorService.notifyDoctorAppointment(doctor_id, {
        appointmentId: appointment.id,
        patientId: req.user.id,
        date: appointment_date,
        time: start_time
      }).catch(err => console.error('Erreur notification:', err));

      res.status(201).json({
        message: 'Rendez-vous créé avec succès',
        appointment
      });

    } catch (error) {
      console.error('❌ Erreur création rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer mes rendez-vous (patient)
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

  // Récupérer les rendez-vous d'un médecin (pour les médecins)
  async getDoctorAppointments(req, res) {
    try {
      // Vérifier que le médecin connecté est bien le médecin concerné
      // ou que c'est un admin
      if (req.user.role !== 'admin' && req.user.id !== req.params.doctorId) {
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

      // Récupérer le rendez-vous
      const appointment = await db.query(
        'SELECT * FROM appointments WHERE id = $1',
        [id]
      );

      if (!appointment.rows[0]) {
        return res.status(404).json({ error: 'Rendez-vous non trouvé' });
      }

      // Vérifier les permissions
      if (appointment.rows[0].patient_id !== req.user.id && 
          appointment.rows[0].doctor_id !== req.user.id && 
          req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Vous n\'êtes pas autorisé à annuler ce rendez-vous' 
        });
      }

      // Vérifier le délai d'annulation
      const appointmentDate = moment(appointment.rows[0].appointment_date);
      const now = moment();
      const hoursDiff = appointmentDate.diff(now, 'hours');

      if (hoursDiff < process.env.MIN_ADVANCE_HOURS && req.user.role !== 'admin') {
        return res.status(400).json({ 
          error: `Les annulations doivent être faites au moins ${process.env.MIN_ADVANCE_HOURS} heures à l'avance` 
        });
      }

      // Mettre à jour le statut
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

  // Confirmer un rendez-vous (médecin)
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

  // Marquer comme terminé (médecin)
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

      if (!date) {
        return res.status(400).json({ error: 'La date est requise' });
      }

      // Vérifier que le médecin existe
      const doctor = await DoctorService.validateDoctor(doctorId);
      if (!doctor) {
        return res.status(404).json({ error: 'Médecin non trouvé' });
      }

      const slots = await Appointment.getDoctorAvailableSlots(doctorId, date);

      res.json({
        doctor_id: doctorId,
        date,
        available_slots: slots
      });

    } catch (error) {
      console.error('❌ Erreur récupération disponibilités:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Obtenir les statistiques
  async getStats(req, res) {
    try {
      const { doctorId, startDate, endDate } = req.query;

      // Vérifier les permissions
      if (doctorId && req.user.role !== 'admin' && req.user.id != doctorId) {
        return res.status(403).json({ 
          error: 'Vous n\'avez pas accès aux statistiques de ce médecin' 
        });
      }

      const stats = await Appointment.getStats(doctorId, startDate, endDate);

      res.json(stats);

    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Reprogrammer un rendez-vous
  async rescheduleAppointment(req, res) {
    try {
      const { id } = req.params;
      const { appointment_date, start_time, duration_minutes } = req.body;

      // Récupérer le rendez-vous existant
      const currentAppointment = await db.query(
        'SELECT * FROM appointments WHERE id = $1',
        [id]
      );

      if (!currentAppointment.rows[0]) {
        return res.status(404).json({ error: 'Rendez-vous non trouvé' });
      }

      // Vérifier les permissions
      if (currentAppointment.rows[0].patient_id !== req.user.id && 
          currentAppointment.rows[0].doctor_id !== req.user.id && 
          req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Vous n\'êtes pas autorisé à reprogrammer ce rendez-vous' 
        });
      }

      // Vérifier la disponibilité du nouveau créneau
      const isAvailable = await Appointment.checkAvailability(
        currentAppointment.rows[0].doctor_id,
        appointment_date,
        start_time,
        duration_minutes || currentAppointment.rows[0].duration_minutes
      );

      if (!isAvailable) {
        return res.status(409).json({ 
          error: 'Le nouveau créneau n\'est pas disponible' 
        });
      }

      // Créer un nouveau rendez-vous
      const newAppointment = await Appointment.create({
        ...currentAppointment.rows[0],
        appointment_date,
        start_time,
        duration_minutes: duration_minutes || currentAppointment.rows[0].duration_minutes,
        rescheduled_from: id,
        created_by: req.user.id
      });

      // Annuler l'ancien
      await Appointment.updateStatus(
        id, 
        'cancelled', 
        req.user.id, 
        'Reprogrammé vers nouveau rendez-vous'
      );

      res.status(201).json({
        message: 'Rendez-vous reprogrammé avec succès',
        old_appointment_id: id,
        new_appointment: newAppointment
      });

    } catch (error) {
      console.error('❌ Erreur reprogrammation rendez-vous:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new AppointmentController();