const db = require('../config/database');

class LabTest {
  // Créer une nouvelle analyse
  static async create(testData) {
    const {
      test_code, test_name, category, description,
      sample_type, preparation_instructions, default_unit,
      reference_ranges, turnaround_hours, price
    } = testData;

    const query = `
      INSERT INTO lab_tests (
        test_code, test_name, category, description,
        sample_type, preparation_instructions, default_unit,
        reference_ranges, turnaround_hours, price
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      test_code, test_name, category, description,
      sample_type, preparation_instructions, default_unit,
      reference_ranges, turnaround_hours, price
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Récupérer toutes les analyses
  static async getAll(activeOnly = true) {
    let query = 'SELECT * FROM lab_tests';
    if (activeOnly) {
      query += ' WHERE is_active = true';
    }
    query += ' ORDER BY category, test_name';
    
    const result = await db.query(query);
    return result.rows;
  }

  // Récupérer par catégorie
  static async getByCategory(category) {
    const query = `
      SELECT * FROM lab_tests 
      WHERE category = $1 AND is_active = true
      ORDER BY test_name
    `;
    const result = await db.query(query, [category]);
    return result.rows;
  }

  // Récupérer par code
  static async findByCode(code) {
    const query = 'SELECT * FROM lab_tests WHERE test_code = $1';
    const result = await db.query(query, [code]);
    return result.rows[0];
  }

  // Récupérer par ID
  static async findById(id) {
    const query = 'SELECT * FROM lab_tests WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Mettre à jour
  static async update(id, testData) {
    const {
      test_name, category, description, sample_type,
      preparation_instructions, default_unit, reference_ranges,
      turnaround_hours, price, is_active
    } = testData;

    const query = `
      UPDATE lab_tests 
      SET test_name = COALESCE($1, test_name),
          category = COALESCE($2, category),
          description = COALESCE($3, description),
          sample_type = COALESCE($4, sample_type),
          preparation_instructions = COALESCE($5, preparation_instructions),
          default_unit = COALESCE($6, default_unit),
          reference_ranges = COALESCE($7, reference_ranges),
          turnaround_hours = COALESCE($8, turnaround_hours),
          price = COALESCE($9, price),
          is_active = COALESCE($10, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      test_name, category, description, sample_type,
      preparation_instructions, default_unit, reference_ranges,
      turnaround_hours, price, is_active, id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Obtenir les catégories
  static async getCategories() {
    const query = `
      SELECT DISTINCT category, COUNT(*) as test_count
      FROM lab_tests
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `;
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = LabTest;