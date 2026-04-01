const db = require('../config/database');

class Medication {
  // Créer un nouveau médicament
  static async create(medicationData) {
    const {
      code, name, generic_name, laboratory, form,
      strength, unit, description, indications,
      contraindications, side_effects, interactions,
      requires_prescription
    } = medicationData;

    const query = `
      INSERT INTO medications (
        code, name, generic_name, laboratory, form,
        strength, unit, description, indications,
        contraindications, side_effects, interactions,
        requires_prescription
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      code, name, generic_name, laboratory, form,
      strength, unit, description, indications,
      contraindications, side_effects, interactions,
      requires_prescription !== false
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Récupérer tous les médicaments
  static async getAll(filters = {}) {
    let query = 'SELECT * FROM medications WHERE is_active = true';
    const values = [];

    if (filters.search) {
      query += ` AND (name ILIKE $${values.length + 1} OR generic_name ILIKE $${values.length + 1} OR code ILIKE $${values.length + 1})`;
      values.push(`%${filters.search}%`);
    }

    if (filters.form) {
      query += ` AND form = $${values.length + 1}`;
      values.push(filters.form);
    }

    if (filters.requires_prescription !== undefined) {
      query += ` AND requires_prescription = $${values.length + 1}`;
      values.push(filters.requires_prescription);
    }

    query += ' ORDER BY name';

    const result = await db.query(query, values);
    return result.rows;
  }

  // Récupérer par ID
  static async findById(id) {
    const query = 'SELECT * FROM medications WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer par code
  static async findByCode(code) {
    const query = 'SELECT * FROM medications WHERE code = $1';
    const result = await db.query(query, [code]);
    return result.rows[0];
  }

  // Mettre à jour
  static async update(id, medicationData) {
    const {
      name, generic_name, laboratory, form,
      strength, unit, description, indications,
      contraindications, side_effects, interactions,
      requires_prescription, is_active
    } = medicationData;

    const query = `
      UPDATE medications 
      SET name = COALESCE($1, name),
          generic_name = COALESCE($2, generic_name),
          laboratory = COALESCE($3, laboratory),
          form = COALESCE($4, form),
          strength = COALESCE($5, strength),
          unit = COALESCE($6, unit),
          description = COALESCE($7, description),
          indications = COALESCE($8, indications),
          contraindications = COALESCE($9, contraindications),
          side_effects = COALESCE($10, side_effects),
          interactions = COALESCE($11, interactions),
          requires_prescription = COALESCE($12, requires_prescription),
          is_active = COALESCE($13, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `;

    const values = [
      name, generic_name, laboratory, form,
      strength, unit, description, indications,
      contraindications, side_effects, interactions,
      requires_prescription, is_active, id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Obtenir les formes disponibles
  static async getForms() {
    const query = `
      SELECT DISTINCT form, COUNT(*) as count
      FROM medications
      WHERE is_active = true
      GROUP BY form
      ORDER BY form
    `;
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = Medication;