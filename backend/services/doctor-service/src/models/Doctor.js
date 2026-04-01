const db = require('../config/database');

class Doctor {
  // Créer un profil médecin
  static async create(doctorData) {
    const {
      user_id, license_number, specialization, sub_specializations,
      years_experience, education, certifications, languages_spoken,
      consultation_fee, accepts_new_patients, bio, profile_picture_url,
      office_address, office_city, office_postal_code, office_phone, office_email
    } = doctorData;

    const query = `
      INSERT INTO doctors (
        user_id, license_number, specialization, sub_specializations,
        years_experience, education, certifications, languages_spoken,
        consultation_fee, accepts_new_patients, bio, profile_picture_url,
        office_address, office_city, office_postal_code, office_phone, office_email
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      user_id, license_number, specialization, sub_specializations || [],
      years_experience, education || [], certifications || [], languages_spoken || ['Français'],
      consultation_fee, accepts_new_patients !== false, bio, profile_picture_url,
      office_address, office_city, office_postal_code, office_phone, office_email
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Trouver un médecin par user_id
  static async findByUserId(userId) {
    try {
      console.log('🔍 Recherche docteur avec user_id:', userId);
      
      const query = 'SELECT * FROM doctors WHERE user_id = $1';
      const result = await db.query(query, [userId]);
      
      console.log('📊 Résultat DB:', result.rows.length ? 'Trouvé' : 'Non trouvé');
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Erreur findByUserId:', error);
      throw error;
    }
  }

  // Trouver un médecin par ID
  static async findById(id) {
    const query = 'SELECT * FROM doctors WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Mettre à jour le profil médecin
  static async update(userId, updateData) {
    const {
      license_number, specialization, sub_specializations, years_experience,
      education, certifications, languages_spoken, consultation_fee,
      accepts_new_patients, bio, profile_picture_url, office_address,
      office_city, office_postal_code, office_phone, office_email
    } = updateData;

    const query = `
      UPDATE doctors 
      SET license_number = COALESCE($1, license_number),
          specialization = COALESCE($2, specialization),
          sub_specializations = COALESCE($3, sub_specializations),
          years_experience = COALESCE($4, years_experience),
          education = COALESCE($5, education),
          certifications = COALESCE($6, certifications),
          languages_spoken = COALESCE($7, languages_spoken),
          consultation_fee = COALESCE($8, consultation_fee),
          accepts_new_patients = COALESCE($9, accepts_new_patients),
          bio = COALESCE($10, bio),
          profile_picture_url = COALESCE($11, profile_picture_url),
          office_address = COALESCE($12, office_address),
          office_city = COALESCE($13, office_city),
          office_postal_code = COALESCE($14, office_postal_code),
          office_phone = COALESCE($15, office_phone),
          office_email = COALESCE($16, office_email),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $17
      RETURNING *
    `;

    const values = [
      license_number, specialization, sub_specializations, years_experience,
      education, certifications, languages_spoken, consultation_fee,
      accepts_new_patients, bio, profile_picture_url, office_address,
      office_city, office_postal_code, office_phone, office_email, userId
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Ajouter un horaire de travail
  static async addSchedule(doctorId, scheduleData) {
    const { day_of_week, start_time, end_time, consultation_duration } = scheduleData;
    
    const query = `
      INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, consultation_duration)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (doctor_id, day_of_week) 
      DO UPDATE SET start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    consultation_duration = EXCLUDED.consultation_duration
      RETURNING *
    `;
    
    const result = await db.query(query, [doctorId, day_of_week, start_time, end_time, consultation_duration || 30]);
    return result.rows[0];
  }

  // Récupérer les horaires d'un médecin
  static async getSchedules(doctorId) {
    const query = `
      SELECT * FROM doctor_schedules 
      WHERE doctor_id = $1 
      ORDER BY day_of_week
    `;
    const result = await db.query(query, [doctorId]);
    return result.rows;
  }

  // Ajouter une période de congé
  static async addLeave(doctorId, leaveData) {
    const { start_date, end_date, reason } = leaveData;
    
    const query = `
      INSERT INTO doctor_leave (doctor_id, start_date, end_date, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [doctorId, start_date, end_date, reason]);
    return result.rows[0];
  }

  // Ajouter un patient au médecin
  static async assignPatient(doctorId, patientId, notes = '') {
    const query = `
      INSERT INTO doctor_patients (doctor_id, patient_id, notes)
      VALUES ($1, $2, $3)
      ON CONFLICT (doctor_id, patient_id) 
      DO UPDATE SET status = 'active', assigned_date = CURRENT_DATE
      RETURNING *
    `;
    
    const result = await db.query(query, [doctorId, patientId, notes]);
    return result.rows[0];
  }

  // Récupérer les patients d'un médecin
  static async getPatients(doctorId) {
    const query = `
      SELECT dp.* 
      FROM doctor_patients dp
      WHERE dp.doctor_id = $1 AND dp.status = 'active'
      ORDER BY dp.assigned_date DESC
    `;
    const result = await db.query(query, [doctorId]);
    return result.rows;
  }

  // Rechercher des médecins par critères
  static async search(searchParams) {
    let query = `
      SELECT d.*
      FROM doctors d
      WHERE d.is_active = true
    `;
    const values = [];
    let paramCount = 1;

    if (searchParams.specialization) {
      query += ` AND d.specialization ILIKE $${paramCount}`;
      values.push(`%${searchParams.specialization}%`);
      paramCount++;
    }

    if (searchParams.city) {
      query += ` AND d.office_city ILIKE $${paramCount}`;
      values.push(`%${searchParams.city}%`);
      paramCount++;
    }

    if (searchParams.name) {
      query += ` AND (d.license_number ILIKE $${paramCount})`; // Temporaire
      values.push(`%${searchParams.name}%`);
      paramCount++;
    }

    if (searchParams.accepts_new_patients) {
      query += ` AND d.accepts_new_patients = true`;
    }

    if (searchParams.language) {
      query += ` AND $${paramCount} = ANY(d.languages_spoken)`;
      values.push(searchParams.language);
      paramCount++;
    }

    query += ' ORDER BY d.specialization, d.id';

    const result = await db.query(query, values);
    return result.rows;
  }

  // Obtenir les statistiques du médecin (VERSION CORRIGÉE)
  static async getStats(doctorId) {
    try {
      console.log('📊 Récupération stats pour doctor:', doctorId);
      
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM doctor_patients WHERE doctor_id = $1 AND status = 'active') as total_patients,
          (SELECT COALESCE(AVG(rating), 0) FROM doctor_reviews WHERE doctor_id = $1) as average_rating,
          (SELECT COUNT(*) FROM doctor_reviews WHERE doctor_id = $1) as total_reviews,
          (SELECT COUNT(*) FROM doctor_leave WHERE doctor_id = $1 AND end_date >= CURRENT_DATE) as upcoming_leaves,
          0 as total_consultations
      `;
      
      const result = await db.query(query, [doctorId]);
      console.log('✅ Stats récupérées:', result.rows[0]);
      
      return result.rows[0];
    } catch (error) {
      console.error('❌ Erreur getStats:', error);
      // Retourner des stats par défaut en cas d'erreur
      return {
        total_patients: 0,
        total_consultations: 0,
        average_rating: 0,
        total_reviews: 0,
        upcoming_leaves: 0
      };
    }
  }

  // Ajouter une évaluation
  static async addReview(doctorId, reviewData) {
    const { patient_id, rating, comment, consultation_date } = reviewData;
    
    const query = `
      INSERT INTO doctor_reviews (doctor_id, patient_id, rating, comment, consultation_date)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (doctor_id, patient_id, consultation_date) 
      DO UPDATE SET rating = EXCLUDED.rating,
                    comment = EXCLUDED.comment,
                    created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query, [doctorId, patient_id, rating, comment, consultation_date]);
    return result.rows[0];
  }

  // Obtenir les disponibilités pour une période (version simplifiée)
  static async getAvailability(doctorId, startDate, endDate) {
    // Version simplifiée en attendant le service de rendez-vous
    const query = `
      SELECT * FROM doctor_schedules 
      WHERE doctor_id = $1
      ORDER BY day_of_week
    `;
    
    const result = await db.query(query, [doctorId]);
    return result.rows;
  }
}

module.exports = Doctor;