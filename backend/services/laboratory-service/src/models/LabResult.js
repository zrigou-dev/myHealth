const db = require('../config/database');

class LabResult {
  // Créer un nouveau résultat
  static async create(resultData) {
    const {
      request_id, request_test_id, test_id, patient_id,
      result_value, result_text, unit, performed_by
    } = resultData;

    console.log('📝 Création résultat pour test:', request_test_id);

    // Récupérer les normes du test pour déterminer le flag
    const test = await db.query('SELECT reference_ranges FROM lab_tests WHERE id = $1', [test_id]);
    const ranges = test.rows[0]?.reference_ranges;
    
    const flag = await this.determineFlag(result_value, ranges);

    const query = `
      INSERT INTO lab_results (
        request_id, request_test_id, test_id, patient_id,
        result_value, result_text, unit, flag, is_abnormal,
        performed_by, performed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      request_id, request_test_id, test_id, patient_id,
      result_value, result_text, unit, flag, flag !== 'normal',
      performed_by
    ];

    const result = await db.query(query, values);
    
    // Mettre à jour le statut du test dans request_tests
    await db.query(
      `UPDATE request_tests 
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [request_test_id]
    );

    // Vérifier si tous les tests de la demande sont complétés
    await this.checkAndUpdateRequestStatus(request_id);

    return result.rows[0];
  }

  // Déterminer le flag (normal/anormal) basé sur les normes
  static async determineFlag(value, referenceRanges) {
    if (!value || !referenceRanges) return 'normal';
    
    try {
      const ranges = typeof referenceRanges === 'string' 
        ? JSON.parse(referenceRanges) 
        : referenceRanges;

      // Chercher la section "normal" dans les normes
      const normal = ranges.normal || ranges;
      
      if (normal.min !== undefined && value < normal.min) {
        if (normal.critical_min !== undefined && value < normal.critical_min) {
          return 'critical_low';
        }
        return 'low';
      }
      
      if (normal.max !== undefined && value > normal.max) {
        if (normal.critical_max !== undefined && value > normal.critical_max) {
          return 'critical_high';
        }
        return 'high';
      }
      
      return 'normal';
    } catch (error) {
      console.error('Erreur détermination flag:', error);
      return 'normal';
    }
  }

  // Valider un résultat
  static async validate(id, validatedBy) {
    const query = `
      UPDATE lab_results 
      SET validated_by = $2, validated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, validatedBy]);
    
    // Mettre à jour le statut de la requête si tous les tests sont validés
    if (result.rows[0]) {
      await this.checkAndUpdateRequestValidation(result.rows[0].request_id);
    }
    
    return result.rows[0];
  }

  // Vérifier et mettre à jour le statut de la demande (complétée)
  static async checkAndUpdateRequestStatus(requestId) {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM request_tests
      WHERE request_id = $1
    `, [requestId]);

    const { total, completed } = result.rows[0];
    
    if (parseInt(completed) === parseInt(total)) {
      await db.query(
        `UPDATE lab_requests 
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [requestId]
      );
    }
  }

  // Vérifier et mettre à jour le statut de la demande (validée)
  static async checkAndUpdateRequestValidation(requestId) {
    // Récupérer tous les résultats de la demande
    const results = await db.query(`
      SELECT lr.*, rt.test_id
      FROM lab_results lr
      JOIN request_tests rt ON lr.request_test_id = rt.id
      WHERE lr.request_id = $1
    `, [requestId]);

    // Récupérer tous les tests de la demande
    const tests = await db.query(`
      SELECT * FROM request_tests WHERE request_id = $1
    `, [requestId]);

    // Vérifier si tous les tests ont un résultat validé
    const allValidated = tests.rows.every(test => {
      const result = results.rows.find(r => r.request_test_id === test.id);
      return result && result.validated_at !== null;
    });

    if (allValidated) {
      await db.query(
        `UPDATE lab_requests 
         SET status = 'validated', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [requestId]
      );
    }
  }

  // Récupérer les résultats d'une demande
  static async getByRequest(requestId) {
    const query = `
      SELECT lr.*, 
             lt.test_name, lt.test_code, lt.reference_ranges,
             rt.sample_collected_at, rt.urgency
      FROM lab_results lr
      JOIN request_tests rt ON lr.request_test_id = rt.id
      JOIN lab_tests lt ON lr.test_id = lt.id
      WHERE lr.request_id = $1
      ORDER BY lr.performed_at
    `;
    const result = await db.query(query, [requestId]);
    return result.rows;
  }

  // Récupérer les résultats d'un patient
  static async getByPatient(patientId, limit = 20) {
    const query = `
      SELECT lr.*, 
             lt.test_name, lt.test_code, lt.reference_ranges,
             lrq.request_number, lrq.request_date
      FROM lab_results lr
      JOIN lab_tests lt ON lr.test_id = lt.id
      JOIN lab_requests lrq ON lr.request_id = lrq.id
      WHERE lr.patient_id = $1
      ORDER BY lr.performed_at DESC
      LIMIT $2
    `;
    const result = await db.query(query, [patientId, limit]);
    return result.rows;
  }

  // Récupérer un résultat par ID
  static async findById(id) {
    const query = `
      SELECT lr.*, 
             lt.test_name, lt.test_code, lt.reference_ranges,
             lrq.request_number, lrq.patient_id, lrq.doctor_id
      FROM lab_results lr
      JOIN lab_tests lt ON lr.test_id = lt.id
      JOIN lab_requests lrq ON lr.request_id = lrq.id
      WHERE lr.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer l'historique d'un patient pour un test spécifique
  static async getPatientTestHistory(patientId, testId, limit = 10) {
    const query = `
      SELECT lr.*, lrq.request_date, lrq.request_number
      FROM lab_results lr
      JOIN lab_requests lrq ON lr.request_id = lrq.id
      WHERE lr.patient_id = $1 AND lr.test_id = $2
      ORDER BY lr.performed_at DESC
      LIMIT $3
    `;
    const result = await db.query(query, [patientId, testId, limit]);
    return result.rows;
  }

  // Obtenir les statistiques des résultats
  static async getStats(filters = {}) {
    const { testId, doctorId, startDate, endDate } = filters;
    
    let query = `
      SELECT 
        COUNT(lr.id) as total_results,
        COUNT(DISTINCT lr.patient_id) as unique_patients,
        AVG(lr.result_value) as average_value,
        COUNT(CASE WHEN lr.is_abnormal THEN 1 END) as abnormal_count,
        COUNT(CASE WHEN lr.flag = 'critical_high' OR lr.flag = 'critical_low' THEN 1 END) as critical_count,
        MIN(lr.performed_at) as first_result,
        MAX(lr.performed_at) as last_result
      FROM lab_results lr
      JOIN lab_requests lrq ON lr.request_id = lrq.id
      WHERE 1=1
    `;
    const values = [];

    if (testId) {
      query += ` AND lr.test_id = $${values.length + 1}`;
      values.push(testId);
    }

    if (doctorId) {
      query += ` AND lrq.doctor_id = $${values.length + 1}`;
      values.push(doctorId);
    }

    if (startDate) {
      query += ` AND lr.performed_at >= $${values.length + 1}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND lr.performed_at <= $${values.length + 1}`;
      values.push(endDate);
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Marquer comme imprimé
  static async markAsPrinted(id) {
    const query = `
      UPDATE lab_results 
      SET printed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Ajouter un commentaire
  static async addComment(id, comment) {
    const query = `
      UPDATE lab_results 
      SET comments = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, comment]);
    return result.rows[0];
  }

  // Supprimer un résultat (soft delete ou réel selon besoin)
  static async delete(id) {
    // Soft delete (marquer comme supprimé)
    const query = `
      UPDATE lab_results 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Obtenir les résultats en attente de validation
  static async getPendingValidation(limit = 50) {
    const query = `
      SELECT lr.*, 
             lt.test_name, lt.test_code,
             lrq.request_number, lrq.patient_id,
             u.first_name, u.last_name
      FROM lab_results lr
      JOIN lab_tests lt ON lr.test_id = lt.id
      JOIN lab_requests lrq ON lr.request_id = lrq.id
      JOIN auth.users u ON lrq.patient_id = u.id
      WHERE lr.validated_at IS NULL
      ORDER BY lr.performed_at
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  // Obtenir les résultats critiques
  static async getCriticalResults(limit = 50) {
    const query = `
      SELECT lr.*, 
             lt.test_name, lt.test_code,
             lrq.request_number, lrq.patient_id,
             u.first_name, u.last_name, u.phone
      FROM lab_results lr
      JOIN lab_tests lt ON lr.test_id = lt.id
      JOIN lab_requests lrq ON lr.request_id = lrq.id
      JOIN auth.users u ON lrq.patient_id = u.id
      WHERE lr.flag IN ('critical_high', 'critical_low')
        AND lr.validated_at IS NOT NULL
      ORDER BY lr.performed_at DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  }
}

module.exports = LabResult;