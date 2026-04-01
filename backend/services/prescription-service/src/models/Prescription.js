const db = require('../config/database');
const moment = require('moment');

class Prescription {
  // Créer une nouvelle prescription
  static async create(prescriptionData) {
    const {
      patient_id, doctor_id, pharmacy_id, appointment_id,
      expiry_date, start_date, diagnosis, clinical_notes,
      patient_instructions, renewals_allowed, priority,
      has_controlled_substance, controlled_substance_id,
      created_by
    } = prescriptionData;

    // Calculer date d'expiration par défaut si non fournie
    const finalExpiryDate = expiry_date || moment().add(process.env.DEFAULT_EXPIRY_DAYS || 30, 'days').format('YYYY-MM-DD');

    const query = `
      INSERT INTO prescriptions (
        patient_id, doctor_id, pharmacy_id, appointment_id,
        prescription_date, expiry_date, start_date,
        diagnosis, clinical_notes, patient_instructions,
        renewals_allowed, priority, has_controlled_substance,
        controlled_substance_id, created_by, status
      )
      VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
      RETURNING *
    `;

    const values = [
      patient_id, doctor_id, pharmacy_id, appointment_id,
      finalExpiryDate, start_date, diagnosis, clinical_notes,
      patient_instructions, renewals_allowed || 0, priority || 'routine',
      has_controlled_substance || false, controlled_substance_id, created_by
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Récupérer une prescription par ID
  static async findById(id) {
    try {
      console.log('🔍 Recherche prescription ID:', id);
      const query = 'SELECT * FROM prescriptions WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Erreur findById:', error);
      throw error;
    }
  }

  // Récupérer par numéro
  static async findByNumber(prescriptionNumber) {
    const query = 'SELECT * FROM prescriptions WHERE prescription_number = $1';
    const result = await db.query(query, [prescriptionNumber]);
    return result.rows[0];
  }

  // Récupérer les prescriptions d'un patient
  static async getByPatient(patientId, filters = {}) {
    let query = `
      SELECT p.*, 
             COUNT(pi.id) as items_count,
             SUM(pi.quantity) as total_items,
             SUM(pi.quantity_dispensed) as total_dispensed
      FROM prescriptions p
      LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
      WHERE p.patient_id = $1
    `;
    const values = [patientId];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND p.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.fromDate) {
      query += ` AND p.prescription_date >= $${paramCount}`;
      values.push(filters.fromDate);
      paramCount++;
    }

    if (filters.toDate) {
      query += ` AND p.prescription_date <= $${paramCount}`;
      values.push(filters.toDate);
      paramCount++;
    }

    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Récupérer les prescriptions d'un médecin
  static async getByDoctor(doctorId, filters = {}) {
    let query = `
      SELECT p.*, 
             COUNT(pi.id) as items_count
      FROM prescriptions p
      LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
      WHERE p.doctor_id = $1
    `;
    const values = [doctorId];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND p.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.fromDate) {
      query += ` AND p.prescription_date >= $${paramCount}`;
      values.push(filters.fromDate);
      paramCount++;
    }

    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Mettre à jour le statut
  static async updateStatus(id, status, userId = null) {
    const query = `
      UPDATE prescriptions 
      SET status = $2, 
          updated_at = CURRENT_TIMESTAMP,
          validated_by = COALESCE($3, validated_by),
          validated_at = CASE WHEN $2 = 'validated' THEN CURRENT_TIMESTAMP ELSE validated_at END
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, status, userId]);
    return result.rows[0];
  }

  // Ajouter des items à la prescription
  static async addItems(prescriptionId, items) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      
      for (const item of items) {
        const {
          medication_id, medication_code, medication_name,
          dosage_value, dosage_unit, dosage_form, strength,
          frequency_value, frequency_unit, frequency_detail,
          duration_value, duration_unit,
          quantity, quantity_unit, instructions, indications,
          substitution_allowed, unit_price
        } = item;

        const total_price = unit_price ? quantity * unit_price : null;

        const query = `
          INSERT INTO prescription_items (
            prescription_id, medication_id, medication_code, medication_name,
            dosage_value, dosage_unit, dosage_form, strength,
            frequency_value, frequency_unit, frequency_detail,
            duration_value, duration_unit,
            quantity, quantity_unit, instructions, indications,
            substitution_allowed, unit_price, total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *
        `;

        const result = await client.query(query, [
          prescriptionId, medication_id, medication_code, medication_name,
          dosage_value, dosage_unit, dosage_form, strength,
          frequency_value, frequency_unit, frequency_detail,
          duration_value, duration_unit,
          quantity, quantity_unit, instructions, indications,
          substitution_allowed, unit_price, total_price
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

  // Récupérer les items d'une prescription
  static async getItems(prescriptionId) {
    const query = `
      SELECT * FROM prescription_items 
      WHERE prescription_id = $1
      ORDER BY id
    `;
    const result = await db.query(query, [prescriptionId]);
    return result.rows;
  }

  // Mettre à jour la quantité délivrée
  static async updateDispensedQuantity(prescriptionId, itemId, quantity) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Mettre à jour l'item
      const itemResult = await client.query(`
        UPDATE prescription_items 
        SET quantity_dispensed = quantity_dispensed + $2
        WHERE id = $1
        RETURNING *
      `, [itemId, quantity]);

      // Vérifier le statut de la prescription
      const itemsResult = await client.query(`
        SELECT 
          SUM(quantity) as total,
          SUM(quantity_dispensed) as dispensed
        FROM prescription_items
        WHERE prescription_id = $1
      `, [prescriptionId]);

      const { total, dispensed } = itemsResult.rows[0];
      
      let newStatus = 'active';
      if (parseInt(dispensed) === 0) {
        newStatus = 'active';
      } else if (parseInt(dispensed) < parseInt(total)) {
        newStatus = 'partially_dispensed';
      } else if (parseInt(dispensed) === parseInt(total)) {
        newStatus = 'dispensed';
      }

      await client.query(`
        UPDATE prescriptions 
        SET status = $2
        WHERE id = $1
      `, [prescriptionId, newStatus]);

      await client.query('COMMIT');
      return itemResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Renouveler une prescription
  static async renew(originalPrescriptionId, newData, renewedBy) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Récupérer la prescription originale
      const original = await client.query(
        'SELECT * FROM prescriptions WHERE id = $1',
        [originalPrescriptionId]
      );

      if (!original.rows[0]) {
        throw new Error('Prescription originale non trouvée');
      }

      // Vérifier le nombre de renouvellements
      if (original.rows[0].renewals_used >= original.rows[0].renewals_allowed) {
        throw new Error('Nombre maximum de renouvellements atteint');
      }

      // Créer la nouvelle prescription
      const newPrescription = await client.query(`
        INSERT INTO prescriptions (
          patient_id, doctor_id, pharmacy_id,
          prescription_date, expiry_date, start_date,
          diagnosis, clinical_notes, patient_instructions,
          renewals_allowed, priority, has_controlled_substance,
          controlled_substance_id, created_by, status,
          original_prescription_id, renewals_used
        )
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', $14, 0)
        RETURNING *
      `, [
        original.rows[0].patient_id,
        original.rows[0].doctor_id,
        original.rows[0].pharmacy_id,
        original.rows[0].expiry_date,
        original.rows[0].start_date,
        original.rows[0].diagnosis,
        original.rows[0].clinical_notes,
        original.rows[0].patient_instructions,
        original.rows[0].renewals_allowed,
        original.rows[0].priority,
        original.rows[0].has_controlled_substance,
        original.rows[0].controlled_substance_id,
        renewedBy,
        originalPrescriptionId
      ]);

      // Copier les items
      const items = await client.query(
        'SELECT * FROM prescription_items WHERE prescription_id = $1',
        [originalPrescriptionId]
      );

      for (const item of items.rows) {
        await client.query(`
          INSERT INTO prescription_items (
            prescription_id, medication_id, medication_code, medication_name,
            dosage_value, dosage_unit, dosage_form, strength,
            frequency_value, frequency_unit, frequency_detail,
            duration_value, duration_unit,
            quantity, quantity_unit, instructions, indications,
            substitution_allowed, unit_price
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
          newPrescription.rows[0].id,
          item.medication_id, item.medication_code, item.medication_name,
          item.dosage_value, item.dosage_unit, item.dosage_form, item.strength,
          item.frequency_value, item.frequency_unit, item.frequency_detail,
          item.duration_value, item.duration_unit,
          item.quantity, item.quantity_unit, item.instructions, item.indications,
          item.substitution_allowed, item.unit_price
        ]);
      }

      // Mettre à jour le compteur de renouvellements de l'originale
      await client.query(`
        UPDATE prescriptions 
        SET renewals_used = renewals_used + 1,
            status = 'renewed'
        WHERE id = $1
      `, [originalPrescriptionId]);

      // Enregistrer le renouvellement
      await client.query(`
        INSERT INTO prescription_renewals (
          original_prescription_id, new_prescription_id, renewed_by
        )
        VALUES ($1, $2, $3)
      `, [originalPrescriptionId, newPrescription.rows[0].id, renewedBy]);

      await client.query('COMMIT');
      return newPrescription.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Valider une prescription
  static async validate(id, validatedBy, notes = null) {
    const query = `
      UPDATE prescriptions 
      SET is_validated = true,
          validated_by = $2,
          validated_at = CURRENT_TIMESTAMP,
          status = 'active'
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, validatedBy]);
    
    if (result.rows[0]) {
      await db.query(`
        INSERT INTO prescription_validations (
          prescription_id, validated_by, validation_notes
        )
        VALUES ($1, $2, $3)
      `, [id, validatedBy, notes]);
    }
    
    return result.rows[0];
  }

  // Statistiques
  static async getStats(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_prescriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'dispensed' THEN 1 END) as dispensed,
        COUNT(CASE WHEN status = 'partially_dispensed' THEN 1 END) as partially_dispensed,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(DISTINCT doctor_id) as unique_doctors,
        AVG((
          SELECT COUNT(*) 
          FROM prescription_items 
          WHERE prescription_id = p.id
        )) as avg_items_per_prescription,
        SUM(CASE WHEN has_controlled_substance THEN 1 ELSE 0 END) as controlled_substances
      FROM prescriptions p
      WHERE 1=1
    `;
    const values = [];

    if (filters.doctorId) {
      query += ` AND p.doctor_id = $${values.length + 1}`;
      values.push(filters.doctorId);
    }

    if (filters.fromDate) {
      query += ` AND p.prescription_date >= $${values.length + 1}`;
      values.push(filters.fromDate);
    }

    if (filters.toDate) {
      query += ` AND p.prescription_date <= $${values.length + 1}`;
      values.push(filters.toDate);
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Vérifier les prescriptions expirées (pour cron job)
  static async checkExpired() {
    const query = `
      UPDATE prescriptions 
      SET status = 'expired'
      WHERE expiry_date < CURRENT_DATE 
        AND status IN ('active', 'partially_dispensed')
      RETURNING id, prescription_number, patient_id
    `;
    const result = await db.query(query);
    return result.rows;
  }

  // Rechercher des prescriptions
  static async search(searchParams) {
    let query = `
      SELECT p.*
      FROM prescriptions p
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (searchParams.patientName) {
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
      values.push(`%${searchParams.patientName}%`);
      paramCount++;
    }

    if (searchParams.doctorName) {
      query += ` AND (d.first_name ILIKE $${paramCount} OR d.last_name ILIKE $${paramCount})`;
      values.push(`%${searchParams.doctorName}%`);
      paramCount++;
    }

    if (searchParams.prescriptionNumber) {
      query += ` AND p.prescription_number ILIKE $${paramCount}`;
      values.push(`%${searchParams.prescriptionNumber}%`);
      paramCount++;
    }

    if (searchParams.status) {
      query += ` AND p.status = $${paramCount}`;
      values.push(searchParams.status);
      paramCount++;
    }

    if (searchParams.fromDate) {
      query += ` AND p.prescription_date >= $${paramCount}`;
      values.push(searchParams.fromDate);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT 50`;

    const result = await db.query(query, values);
    return result.rows;
  }

  // Envoyer à une pharmacie (patient)
  static async sendToPharmacy(id, pharmacyId) {
    const query = `
      UPDATE prescriptions 
      SET pharmacy_id = $2, 
          status = 'sent_to_pharmacy',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'active'
      RETURNING *
    `;
    const result = await db.query(query, [id, pharmacyId]);
    return result.rows[0];
  }

  // Répondre à une prescription (pharmacien)
  static async respondByPharmacy(id, status, reason = null) {
    const query = `
      UPDATE prescriptions 
      SET status = $2, 
          rejection_reason = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'sent_to_pharmacy'
      RETURNING *
    `;
    const result = await db.query(query, [id, status, reason]);
    return result.rows[0];
  }

  // Récupérer les prescriptions pour une pharmacie
  static async getByPharmacy(pharmacyId, status = null) {
    let query = `
      SELECT p.*
      FROM prescriptions p
      WHERE p.pharmacy_id = $1
    `;
    const values = [pharmacyId];

    if (status) {
      query += ` AND p.status = $2`;
      values.push(status);
    } else {
      query += ` AND p.status IN ('sent_to_pharmacy', 'accepted', 'rejected', 'dispensed')`;
    }

    query += ` ORDER BY p.updated_at DESC`;

    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = Prescription;