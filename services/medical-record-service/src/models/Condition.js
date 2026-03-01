const { pg } = require("../config/database");

class Condition {
  // Ajouter un antécédent
  static async create(conditionData) {
    const {
      patient_id,
      condition_name,
      icd10_code,
      diagnosed_date,
      diagnosed_by,
      is_chronic,
      severity,
      notes,
    } = conditionData;

    const query = `
      INSERT INTO medical_conditions (
        patient_id, condition_name, icd10_code,
        diagnosed_date, diagnosed_by, is_chronic,
        severity, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      patient_id,
      condition_name,
      icd10_code,
      diagnosed_date,
      diagnosed_by,
      is_chronic || false,
      severity,
      notes,
    ];

    const result = await pg.query(query, values);
    return result.rows[0];
  }

  // Récupérer les antécédents
  static async getByPatient(patientId, activeOnly = false) {
    let query = "SELECT * FROM medical_conditions WHERE patient_id = $1";
    const values = [patientId];

    if (activeOnly) {
      query += " AND is_resolved = false";
    }

    query += " ORDER BY diagnosed_date DESC";

    const result = await pg.query(query, values);
    return result.rows;
  }

  // Marquer comme résolu
  static async resolve(id, resolvedDate = null) {
    const query = `
      UPDATE medical_conditions 
      SET is_resolved = true,
          resolved_date = COALESCE($2, CURRENT_DATE),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pg.query(query, [id, resolvedDate]);
    return result.rows[0];
  }

  // Mettre à jour
  static async update(id, conditionData) {
    const { condition_name, icd10_code, severity, notes, is_resolved } =
      conditionData;

    const query = `
      UPDATE medical_conditions 
      SET condition_name = COALESCE($1, condition_name),
          icd10_code = COALESCE($2, icd10_code),
          severity = COALESCE($3, severity),
          notes = COALESCE($4, notes),
          is_resolved = COALESCE($5, is_resolved),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    const values = [
      condition_name,
      icd10_code,
      severity,
      notes,
      is_resolved,
      id,
    ];
    const result = await pg.query(query, values);
    return result.rows[0];
  }

  // Récupérer une condition spécifique
  static async getById(id) {
    const query = "SELECT * FROM medical_conditions WHERE id = $1";
    const result = await pg.query(query, [id]);
    return result.rows[0];
  }

  // Supprimer une condition
  static async delete(id) {
    const query = "DELETE FROM medical_conditions WHERE id = $1 RETURNING *";
    const result = await pg.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Condition;
