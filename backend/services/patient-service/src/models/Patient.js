const db = require('../config/database');

class Patient {
  // Créer un nouveau dossier patient
  static async create(patientData) {
    const {
      user_id, date_of_birth, gender, blood_type, height, weight,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      address, city, postal_code, country, insurance_provider,
      insurance_policy_number, insurance_expiry_date, allergies,
      chronic_conditions, current_medications, medical_history, vaccinations
    } = patientData;

    const query = `
      INSERT INTO patients (
        user_id, date_of_birth, gender, blood_type, height, weight,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        address, city, postal_code, country, insurance_provider,
        insurance_policy_number, insurance_expiry_date, allergies,
        chronic_conditions, current_medications, medical_history, vaccinations
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;

    const values = [
      user_id, date_of_birth, gender, blood_type, height, weight,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      address, city, postal_code, country, insurance_provider,
      insurance_policy_number, insurance_expiry_date, 
      allergies || [], chronic_conditions || [], 
      current_medications || [], medical_history, vaccinations || []
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Trouver un patient par user_id
  static async findByUserId(userId) {
    const query = 'SELECT * FROM patients WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  // Trouver un patient par ID
  static async findById(id) {
    const query = 'SELECT * FROM patients WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Mettre à jour un patient
  static async update(userId, updateData) {
    const {
      date_of_birth, gender, blood_type, height, weight,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      address, city, postal_code, country, insurance_provider,
      insurance_policy_number, insurance_expiry_date, allergies,
      chronic_conditions, current_medications, medical_history, vaccinations
    } = updateData;

    const query = `
      UPDATE patients 
      SET date_of_birth = COALESCE($1, date_of_birth),
          gender = COALESCE($2, gender),
          blood_type = COALESCE($3, blood_type),
          height = COALESCE($4, height),
          weight = COALESCE($5, weight),
          emergency_contact_name = COALESCE($6, emergency_contact_name),
          emergency_contact_phone = COALESCE($7, emergency_contact_phone),
          emergency_contact_relation = COALESCE($8, emergency_contact_relation),
          address = COALESCE($9, address),
          city = COALESCE($10, city),
          postal_code = COALESCE($11, postal_code),
          country = COALESCE($12, country),
          insurance_provider = COALESCE($13, insurance_provider),
          insurance_policy_number = COALESCE($14, insurance_policy_number),
          insurance_expiry_date = COALESCE($15, insurance_expiry_date),
          allergies = COALESCE($16, allergies),
          chronic_conditions = COALESCE($17, chronic_conditions),
          current_medications = COALESCE($18, current_medications),
          medical_history = COALESCE($19, medical_history),
          vaccinations = COALESCE($20, vaccinations),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $21
      RETURNING *
    `;

    const values = [
      date_of_birth, gender, blood_type, height, weight,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      address, city, postal_code, country, insurance_provider,
      insurance_policy_number, insurance_expiry_date, 
      allergies, chronic_conditions, current_medications, 
      medical_history, vaccinations, userId
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Ajouter une note
  static async addNote(patientId, noteData) {
    const { note_type, title, content, created_by } = noteData;
    
    const query = `
      INSERT INTO patient_notes (patient_id, note_type, title, content, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [patientId, note_type, title, content, created_by]);
    return result.rows[0];
  }

  // Récupérer les notes d'un patient
  static async getNotes(patientId) {
    const query = `
      SELECT * FROM patient_notes 
      WHERE patient_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  // Ajouter un contact d'urgence
  static async addEmergencyContact(patientId, contactData) {
    const { full_name, relationship, phone, email, is_primary } = contactData;
    
    const query = `
      INSERT INTO patient_contacts (patient_id, contact_type, full_name, relationship, phone, email, is_primary)
      VALUES ($1, 'emergency', $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(query, [patientId, full_name, relationship, phone, email, is_primary || false]);
    return result.rows[0];
  }

  // Rechercher des patients
  static async search(searchParams) {
    let query = `
      SELECT p.*
      FROM patients p
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (searchParams.name) {
      query += ` AND (p.emergency_contact_name ILIKE $${paramCount})`; // Temporaire
      values.push(`%${searchParams.name}%`);
      paramCount++;
    }

    if (searchParams.insurance) {
      query += ` AND p.insurance_policy_number ILIKE $${paramCount}`;
      values.push(`%${searchParams.insurance}%`);
      paramCount++;
    }

    if (searchParams.city) {
      query += ` AND p.city ILIKE $${paramCount}`;
      values.push(`%${searchParams.city}%`);
      paramCount++;
    }

    query += ' ORDER BY p.id';

    const result = await db.query(query, values);
    return result.rows;
  }

  // Statistiques patients
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN is_active THEN 1 END) as active_patients,
        COUNT(DISTINCT insurance_provider) as insurance_providers,
        AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))) as average_age,
        COUNT(CASE WHEN date_of_birth > CURRENT_DATE - INTERVAL '1 year' THEN 1 END) as new_patients_year
      FROM patients
    `;
    
    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = Patient;