const { pg } = require("../config/database");

class Allergy {
  // Ajouter une allergie
  static async create(allergyData) {
    const {
      patient_id,
      allergen,
      reaction,
      severity,
      diagnosed_date,
      diagnosed_by,
      notes,
    } = allergyData;

    const query = `
      INSERT INTO allergies (
        patient_id, allergen, reaction, severity,
        diagnosed_date, diagnosed_by, notes, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *
    `;

    const values = [
      patient_id,
      allergen,
      reaction,
      severity,
      diagnosed_date,
      diagnosed_by,
      notes,
    ];
    const result = await pg.query(query, values);
    return result.rows[0];
  }

  // Récupérer les allergies d'un patient
  static async getByPatient(patientId, activeOnly = true) {
    let query = "SELECT * FROM allergies WHERE patient_id = $1";
    const values = [patientId];

    if (activeOnly) {
      query += " AND is_active = true";
    }

    query += " ORDER BY severity DESC, created_at DESC";

    const result = await pg.query(query, values);
    return result.rows;
  }

  // Mettre à jour une allergie
  static async update(id, allergyData) {
    const { allergen, reaction, severity, diagnosed_date, notes, is_active } =
      allergyData;

    const query = `
      UPDATE allergies 
      SET allergen = COALESCE($1, allergen),
          reaction = COALESCE($2, reaction),
          severity = COALESCE($3, severity),
          diagnosed_date = COALESCE($4, diagnosed_date),
          notes = COALESCE($5, notes),
          is_active = COALESCE($6, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const values = [
      allergen,
      reaction,
      severity,
      diagnosed_date,
      notes,
      is_active,
      id,
    ];
    const result = await pg.query(query, values);
    return result.rows[0];
  }

  // Désactiver une allergie
  static async deactivate(id) {
    const query = `
      UPDATE allergies 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pg.query(query, [id]);
    return result.rows[0];
  }

  // Supprimer une allergie
  static async delete(id) {
    const query = "DELETE FROM allergies WHERE id = $1 RETURNING *";
    const result = await pg.query(query, [id]);
    return result.rows[0];
  }

  // Réactiver une allergie
  static async reactivate(id) {
    const query = `
      UPDATE allergies 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pg.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer les allergies communes
  static async getCommonAllergies(limit = 10) {
    const query = `
      SELECT allergen, COUNT(*) as count, array_agg(severity) as severities
      FROM allergies
      WHERE is_active = true
      GROUP BY allergen
      ORDER BY count DESC
      LIMIT $1
    `;
    const result = await pg.query(query, [limit]);
    return result.rows;
  }
}

module.exports = Allergy;
