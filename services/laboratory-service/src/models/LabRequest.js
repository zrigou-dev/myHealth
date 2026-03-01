const db = require('../config/database');
const moment = require('moment');

class LabRequest {
  // Créer une nouvelle demande
  static async create(requestData) {
    const {
      patient_id, doctor_id, appointment_id,
      priority, clinical_info, diagnosis, notes, requested_by
    } = requestData;

    const query = `
      INSERT INTO lab_requests (
        patient_id, doctor_id, appointment_id, request_date,
        priority, clinical_info, diagnosis, notes, requested_by,
        status
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `;

    const values = [
      patient_id, doctor_id, appointment_id,
      priority || 'routine', clinical_info, diagnosis, notes, requested_by
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Ajouter des tests à une demande
  static async addTests(requestId, tests) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      
      for (const test of tests) {
        const { test_id, test_name, test_code, urgency, notes } = test;
        
        const query = `
          INSERT INTO request_tests (
            request_id, test_id, test_name, test_code,
            urgency, notes, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'pending')
          RETURNING *
        `;
        
        const result = await client.query(query, [
          requestId, test_id, test_name, test_code,
          urgency || 'routine', notes
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

  // Récupérer une demande par ID
  static async findById(id) {
    const query = 'SELECT * FROM lab_requests WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer par numéro de demande
  static async findByNumber(requestNumber) {
    const query = 'SELECT * FROM lab_requests WHERE request_number = $1';
    const result = await db.query(query, [requestNumber]);
    return result.rows[0];
  }

  // Récupérer les demandes d'un patient
  static async getByPatient(patientId, status = null) {
    let query = `
      SELECT lr.*, 
             COUNT(rt.id) as tests_count,
             SUM(CASE WHEN rt.status = 'completed' THEN 1 ELSE 0 END) as completed_tests
      FROM lab_requests lr
      LEFT JOIN request_tests rt ON lr.id = rt.request_id
      WHERE lr.patient_id = $1
    `;
    const values = [patientId];

    if (status) {
      query += ` AND lr.status = $2`;
      values.push(status);
    }

    query += ` GROUP BY lr.id ORDER BY lr.created_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Récupérer les demandes d'un médecin
  static async getByDoctor(doctorId, status = null) {
    let query = `
      SELECT lr.*, 
             COUNT(rt.id) as tests_count,
             u.first_name, u.last_name
      FROM lab_requests lr
      LEFT JOIN request_tests rt ON lr.id = rt.request_id
      JOIN auth.users u ON lr.patient_id = u.id
      WHERE lr.doctor_id = $1
    `;
    const values = [doctorId];

    if (status) {
      query += ` AND lr.status = $2`;
      values.push(status);
    }

    query += ` GROUP BY lr.id, u.first_name, u.last_name ORDER BY lr.created_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Récupérer les tests d'une demande
  static async getTests(requestId) {
    const query = `
      SELECT rt.*, lt.reference_ranges, lt.default_unit
      FROM request_tests rt
      LEFT JOIN lab_tests lt ON rt.test_id = lt.id
      WHERE rt.request_id = $1
      ORDER BY rt.created_at
    `;
    const result = await db.query(query, [requestId]);
    return result.rows;
  }

  // Mettre à jour le statut
  static async updateStatus(id, status) {
    const query = `
      UPDATE lab_requests 
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, status]);
    return result.rows[0];
  }

  // Mettre à jour le statut d'un test
  static async updateTestStatus(testId, status, data = {}) {
    const { sample_collected_at, sample_collected_by, notes } = data;
    
    const query = `
      UPDATE request_tests 
      SET status = $2,
          sample_collected_at = COALESCE($3, sample_collected_at),
          sample_collected_by = COALESCE($4, sample_collected_by),
          notes = COALESCE($5, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [testId, status, sample_collected_at, sample_collected_by, notes]);
    return result.rows[0];
  }

  // Statistiques
  static async getStats(doctorId = null, startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'validated' THEN 1 END) as validated,
        AVG(CASE WHEN status = 'completed' 
            THEN EXTRACT(EPOCH FROM (updated_at - created_at))/3600 
            END) as avg_completion_hours
      FROM lab_requests
      WHERE 1=1
    `;
    const values = [];

    if (doctorId) {
      query += ` AND doctor_id = $${values.length + 1}`;
      values.push(doctorId);
    }

    if (startDate) {
      query += ` AND request_date >= $${values.length + 1}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND request_date <= $${values.length + 1}`;
      values.push(endDate);
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = LabRequest;