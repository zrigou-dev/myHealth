const db = require('../config/database');

class PrescriptionTemplate {
  // Créer un template
  static async create(templateData) {
    const {
      template_name, template_code, doctor_id,
      is_public, template_data
    } = templateData;

    const query = `
      INSERT INTO prescription_templates (
        template_name, template_code, doctor_id,
        is_public, template_data
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      template_name, template_code, doctor_id,
      is_public || false, template_data
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Récupérer les templates disponibles
  static async getAvailable(doctorId = null) {
    let query = `
      SELECT * FROM prescription_templates
      WHERE is_public = true OR doctor_id = $1
      ORDER BY template_name
    `;
    const result = await db.query(query, [doctorId]);
    return result.rows;
  }

  // Récupérer un template par ID
  static async findById(id) {
    const query = 'SELECT * FROM prescription_templates WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Mettre à jour un template
  static async update(id, templateData) {
    const {
      template_name, template_data, is_public
    } = templateData;

    const query = `
      UPDATE prescription_templates 
      SET template_name = COALESCE($1, template_name),
          template_data = COALESCE($2, template_data),
          is_public = COALESCE($3, is_public),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const values = [template_name, template_data, is_public, id];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Supprimer un template
  static async delete(id) {
    const query = 'DELETE FROM prescription_templates WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = PrescriptionTemplate;