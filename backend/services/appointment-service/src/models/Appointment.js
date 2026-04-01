const db = require('../config/database');
const moment = require('moment');

class Appointment {
  // Créer un nouveau rendez-vous
  static async create(appointmentData) {
    const {
      patient_id, doctor_id, appointment_date, start_time,
      duration_minutes, reason, notes, created_by
    } = appointmentData;

    // Calculer l'heure de fin
    const startMoment = moment(start_time, 'HH:mm');
    const endMoment = startMoment.clone().add(duration_minutes || 30, 'minutes');
    const end_time = endMoment.format('HH:mm');

    const query = `
      INSERT INTO appointments (
        patient_id, doctor_id, appointment_date, start_time, 
        end_time, duration_minutes, reason, notes, created_by,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled')
      RETURNING *
    `;

    const values = [
      patient_id, doctor_id, appointment_date, start_time,
      end_time, duration_minutes || 30, reason, notes, created_by
    ];

    const result = await db.query(query, values);
    
    // Ajouter à l'historique
    await this.addToHistory(result.rows[0].id, null, 'scheduled', created_by, 'Création du rendez-vous');
    
    return result.rows[0];
  }

  // Vérifier la disponibilité
  static async checkAvailability(doctor_id, appointment_date, start_time, duration_minutes = 30) {
    const end_time = moment(start_time, 'HH:mm')
      .add(duration_minutes, 'minutes')
      .format('HH:mm');

    const query = `
      SELECT COUNT(*) as conflicts
      FROM appointments
      WHERE doctor_id = $1 
        AND appointment_date = $2
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time <= $3 AND end_time > $3)
          OR (start_time < $4 AND end_time >= $4)
          OR (start_time >= $3 AND end_time <= $4)
        )
    `;

    const result = await db.query(query, [doctor_id, appointment_date, start_time, end_time]);
    return result.rows[0].conflicts === '0';
  }

  // Récupérer les rendez-vous d'un patient
  static async getByPatient(patientId, status = null, limit = 50) {
    let query = `
      SELECT a.*, 
             ct.name as consultation_type_name
      FROM appointments a
      LEFT JOIN consultation_types ct ON ct.duration_minutes = a.duration_minutes
      WHERE a.patient_id = $1
    `;
    const values = [patientId];

    if (status) {
      query += ` AND a.status = $2`;
      values.push(status);
    }

    query += ` ORDER BY a.appointment_date DESC, a.start_time DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const result = await db.query(query, values);
    return result.rows;
  }

  // Récupérer les rendez-vous d'un médecin
  static async getByDoctor(doctorId, date = null, status = null) {
    let query = `
      SELECT a.*
      FROM appointments a
      WHERE a.doctor_id = $1
    `;
    const values = [doctorId];

    if (date) {
      query += ` AND a.appointment_date = $2`;
      values.push(date);
    }

    if (status) {
      query += ` AND a.status = $${values.length + 1}`;
      values.push(status);
    }

    query += ` ORDER BY a.appointment_date, a.start_time`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Mettre à jour le statut
  static async updateStatus(appointmentId, newStatus, userId, reason = null) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Récupérer l'ancien statut
      const current = await client.query(
        'SELECT status FROM appointments WHERE id = $1',
        [appointmentId]
      );
      const oldStatus = current.rows[0]?.status;

      // Mettre à jour le statut
      const statusFields = {
        confirmed: 'confirmed_at',
        cancelled: 'cancelled_at',
        completed: 'completed_at',
        rejected: 'rejected_at'
      };

      let updateQuery = 'UPDATE appointments SET status = $2';
      const values = [appointmentId, newStatus];

      if (statusFields[newStatus]) {
        updateQuery += `, ${statusFields[newStatus]} = CURRENT_TIMESTAMP`;
      }

      if ((newStatus === 'cancelled' || newStatus === 'rejected') && reason) {
        const reasonColumn = newStatus === 'rejected' ? 'rejection_reason' : 'cancellation_reason';
        updateQuery += `, ${reasonColumn} = $3`;
        values.push(reason);
      }

      updateQuery += ' WHERE id = $1 RETURNING *';

      const result = await client.query(updateQuery, values);

      // Ajouter à l'historique
      await client.query(
        `INSERT INTO appointment_history 
         (appointment_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [appointmentId, oldStatus, newStatus, userId, reason]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Ajouter à l'historique
  static async addToHistory(appointmentId, oldStatus, newStatus, userId, reason) {
    const query = `
      INSERT INTO appointment_history 
      (appointment_id, previous_status, new_status, changed_by, reason)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await db.query(query, [appointmentId, oldStatus, newStatus, userId, reason]);
  }

  // Obtenir les disponibilités pour un médecin
  static async getDoctorAvailableSlots(doctorId, date) {
    const query = `
      WITH day_schedule AS (
        SELECT 
          generate_series(
            date $1 + start_time,
            date $1 + end_time - interval '1 minute',
            interval '30 minutes'
          ) as slot_start
        FROM doctor_schedules
        WHERE doctor_id = $2 
          AND day_of_week = EXTRACT(DOW FROM $1::date)
      ),
      booked_slots AS (
        SELECT 
          date $1 + start_time as slot_start
        FROM appointments
        WHERE doctor_id = $2 
          AND appointment_date = $1
          AND status NOT IN ('cancelled', 'no_show')
      )
      SELECT 
        to_char(slot_start, 'HH24:MI') as start_time,
        to_char(slot_start + interval '30 minutes', 'HH24:MI') as end_time
      FROM day_schedule
      WHERE slot_start NOT IN (SELECT slot_start FROM booked_slots)
      ORDER BY slot_start
    `;

    const result = await db.query(query, [date, doctorId]);
    return result.rows;
  }

  // Statistiques
  static async getStats(doctorId = null, startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
        COUNT(DISTINCT patient_id) as unique_patients
      FROM appointments
      WHERE 1=1
    `;
    const values = [];

    if (doctorId) {
      query += ` AND doctor_id = $${values.length + 1}`;
      values.push(doctorId);
    }

    if (startDate) {
      query += ` AND appointment_date >= $${values.length + 1}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND appointment_date <= $${values.length + 1}`;
      values.push(endDate);
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Vérifier les conflits pour un médecin
  static async checkDoctorConflicts(doctorId, date, startTime, endTime, excludeAppointmentId = null) {
    let query = `
      SELECT id FROM appointments
      WHERE doctor_id = $1 
        AND appointment_date = $2
        AND status NOT IN ('cancelled', 'no_show')
        AND (
          (start_time <= $3 AND end_time > $3)
          OR (start_time < $4 AND end_time >= $4)
          OR (start_time >= $3 AND end_time <= $4)
        )
    `;
    const values = [doctorId, date, startTime, endTime];

    if (excludeAppointmentId) {
      query += ` AND id != $${values.length + 1}`;
      values.push(excludeAppointmentId);
    }

    const result = await db.query(query, values);
    return result.rows.length > 0;
  }
}

module.exports = Appointment;