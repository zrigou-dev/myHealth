const { pg } = require("../config/database");

class Vaccination {
  // Ajouter une vaccination
  static async create(vaccinationData) {
    const {
      patient_id,
      vaccine_name,
      administration_date,
      next_due_date,
      administered_by,
      batch_number,
      manufacturer,
      site,
      reaction,
      notes,
    } = vaccinationData;

    const query = `
      INSERT INTO vaccinations (
        patient_id, vaccine_name, administration_date,
        next_due_date, administered_by, batch_number,
        manufacturer, site, reaction, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      patient_id,
      vaccine_name,
      administration_date,
      next_due_date,
      administered_by,
      batch_number,
      manufacturer,
      site,
      reaction,
      notes,
    ];

    const result = await pg.query(query, values);
    return result.rows[0];
  }

  // Récupérer l'historique des vaccinations
  static async getByPatient(patientId) {
    const query = `
      SELECT * FROM vaccinations 
      WHERE patient_id = $1
      ORDER BY administration_date DESC
    `;
    const result = await pg.query(query, [patientId]);
    return result.rows;
  }

  // Récupérer les vaccinations à venir
  static async getUpcoming(patientId) {
    const query = `
      SELECT * FROM vaccinations 
      WHERE patient_id = $1
        AND next_due_date IS NOT NULL
        AND next_due_date > CURRENT_DATE
      ORDER BY next_due_date
    `;
    const result = await pg.query(query, [patientId]);
    return result.rows;
  }

  // Vérifier si un vaccin est dû
  static async checkDue(patientId, vaccineName) {
    const query = `
      SELECT * FROM vaccinations 
      WHERE patient_id = $1
        AND vaccine_name = $2
        AND next_due_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY next_due_date
    `;
    const result = await pg.query(query, [patientId, vaccineName]);
    return result.rows;
  }

  // Récupérer une vaccination spécifique
  static async getById(id) {
    const query = "SELECT * FROM vaccinations WHERE id = $1";
    const result = await pg.query(query, [id]);
    return result.rows[0];
  }

  // Mettre à jour une vaccination
  static async update(id, vaccinationData) {
    const {
      vaccine_name,
      administration_date,
      next_due_date,
      batch_number,
      manufacturer,
      site,
      reaction,
      notes,
    } = vaccinationData;

    const query = `
      UPDATE vaccinations 
      SET vaccine_name = COALESCE($1, vaccine_name),
          administration_date = COALESCE($2, administration_date),
          next_due_date = COALESCE($3, next_due_date),
          batch_number = COALESCE($4, batch_number),
          manufacturer = COALESCE($5, manufacturer),
          site = COALESCE($6, site),
          reaction = COALESCE($7, reaction),
          notes = COALESCE($8, notes)
      WHERE id = $9
      RETURNING *
    `;

    const values = [
      vaccine_name,
      administration_date,
      next_due_date,
      batch_number,
      manufacturer,
      site,
      reaction,
      notes,
      id,
    ];
    const result = await pg.query(query, values);
    return result.rows[0];
  }

  // Supprimer une vaccination
  static async delete(id) {
    const query = "DELETE FROM vaccinations WHERE id = $1 RETURNING *";
    const result = await pg.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Vaccination;
