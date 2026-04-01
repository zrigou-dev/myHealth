const db = require('../config/database');
const moment = require('moment');

class Prescription {
  // Créer une nouvelle prescription
  static async create(prescriptionData) {
    const {
      patient_id, doctor_id, appointment_id,
      expiry_date, diagnosis, notes, created_by
    } = prescriptionData;

    const query = `
      INSERT INTO prescriptions (
        patient_id, doctor_id, appointment_id,
        prescription_date, expiry_date, diagnosis,
        notes, created_by, status
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, 'active')
      RETURNING *
    `;

    const values = [
      patient_id, doctor_id, appointment_id,
      expiry_date, diagnosis, notes, created_by
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Ajouter des lignes de prescription
  static async addItems(prescriptionId, items) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      
      for (const item of items) {
        const {
          medication_id, medication_name, dosage,
          frequency, duration, quantity, instructions,
          substitution_allowed
        } = item;

        const query = `
          INSERT INTO prescription_items (
            prescription_id, medication_id, medication_name,
            dosage, frequency, duration, quantity,
            instructions, substitution_allowed
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;

        const result = await client.query(query, [
          prescriptionId, medication_id, medication_name,
          dosage, frequency, duration, quantity,
          instructions, substitution_allowed || false
        ]);

        results.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Récupérer une prescription par ID
  static async findById(id) {
    const query = 'SELECT * FROM prescriptions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer par numéro
  static async findByNumber(prescriptionNumber) {
    const query = 'SELECT * FROM prescriptions WHERE prescription_number = $1';
    const result = await db.query(query, [prescriptionNumber]);
    return result.rows[0];
  }

  // Récupérer les prescriptions d'un patient
  static async getByPatient(patientId, status = null) {
    let query = `
      SELECT p.*, 
             COUNT(pi.id) as items_count,
             SUM(CASE WHEN pi.quantity_dispensed < pi.quantity THEN 1 ELSE 0 END) as pending_items
      FROM prescriptions p
      LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
      WHERE p.patient_id = $1
    `;
    const values = [patientId];

    if (status) {
      query += ` AND p.status = $2`;
      values.push(status);
    }

    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Récupérer les prescriptions d'un médecin
  static async getByDoctor(doctorId, status = null) {
    let query = `
      SELECT p.*, 
             COUNT(pi.id) as items_count,
             u.first_name, u.last_name
      FROM prescriptions p
      LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
      JOIN auth.users u ON p.patient_id = u.id
      WHERE p.doctor_id = $1
    `;
    const values = [doctorId];

    if (status) {
      query += ` AND p.status = $2`;
      values.push(status);
    }

    query += ` GROUP BY p.id, u.first_name, u.last_name ORDER BY p.created_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Récupérer les lignes d'une prescription
  static async getItems(prescriptionId) {
    const query = `
      SELECT pi.*, m.code, m.form, m.strength, m.unit
      FROM prescription_items pi
      LEFT JOIN medications m ON pi.medication_id = m.id
      WHERE pi.prescription_id = $1
      ORDER BY pi.id
    `;
    const result = await db.query(query, [prescriptionId]);
    return result.rows;
  }

  // Mettre à jour le statut
  static async updateStatus(id, status) {
    const query = `
      UPDATE prescriptions 
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, status]);
    return result.rows[0];
  }

  // Vérifier les prescriptions expirées (cron job)
  static async checkExpiredPrescriptions() {
    const query = `
      UPDATE prescriptions 
      SET status = 'expired'
      WHERE expiry_date < CURRENT_DATE 
        AND status = 'active'
      RETURNING id, prescription_number, patient_id
    `;
    const result = await db.query(query);
    return result.rows;
  }

  // Statistiques
  static async getStats(doctorId = null, startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(*) as total_prescriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'dispensed' THEN 1 END) as dispensed,
        COUNT(CASE WHEN status = 'partially_dispensed' THEN 1 END) as partially_dispensed,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        AVG((
          SELECT COUNT(*) 
          FROM prescription_items 
          WHERE prescription_id = p.id
        )) as avg_items_per_prescription
      FROM prescriptions p
      WHERE 1=1
    `;
    const values = [];

    if (doctorId) {
      query += ` AND p.doctor_id = $${values.length + 1}`;
      values.push(doctorId);
    }

    if (startDate) {
      query += ` AND p.prescription_date >= $${values.length + 1}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND p.prescription_date <= $${values.length + 1}`;
      values.push(endDate);
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = Prescription;