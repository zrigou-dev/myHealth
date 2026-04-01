const db = require('../config/database');

class Dispensation {
  // Créer une nouvelle délivrance
  static async create(dispensationData) {
    const {
      prescription_id, patient_id, pharmacist_id, notes
    } = dispensationData;

    const query = `
      INSERT INTO dispensations (
        prescription_id, patient_id, pharmacist_id, notes
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [prescription_id, patient_id, pharmacist_id, notes];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Ajouter des lignes de délivrance
  static async addItems(dispensationId, items) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      
      for (const item of items) {
        const {
          prescription_item_id, medication_id, batch_id,
          quantity, unit_price, total_price
        } = item;

        // Vérifier le stock
        const stockCheck = await client.query(`
          SELECT quantity FROM medication_batches 
          WHERE id = $1 FOR UPDATE
        `, [batch_id]);

        if (stockCheck.rows[0].quantity < quantity) {
          throw new Error(`Stock insuffisant pour le lot ${batch_id}`);
        }

        // Ajouter la ligne de délivrance
        const itemQuery = `
          INSERT INTO dispensation_items (
            dispensation_id, prescription_item_id, medication_id,
            batch_id, quantity, unit_price, total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        const itemResult = await client.query(itemQuery, [
          dispensationId, prescription_item_id, medication_id,
          batch_id, quantity, unit_price, total_price
        ]);

        // Mettre à jour le stock
        await client.query(`
          UPDATE medication_batches 
          SET quantity = quantity - $2
          WHERE id = $1
        `, [batch_id, quantity]);

        // Mettre à jour la quantité délivrée dans la prescription
        await client.query(`
          UPDATE prescription_items 
          SET quantity_dispensed = quantity_dispensed + $2
          WHERE id = $1
        `, [prescription_item_id, quantity]);

        results.push(itemResult.rows[0]);
      }

      // Mettre à jour le statut de la prescription
      await client.query(`
        WITH prescription_totals AS (
          SELECT 
            prescription_id,
            SUM(quantity) as total,
            SUM(quantity_dispensed) as dispensed
          FROM prescription_items
          WHERE prescription_id = (
            SELECT prescription_id FROM dispensations WHERE id = $1
          )
          GROUP BY prescription_id
        )
        UPDATE prescriptions p
        SET status = CASE 
          WHEN pt.dispensed = 0 THEN 'active'
          WHEN pt.dispensed < pt.total THEN 'partially_dispensed'
          WHEN pt.dispensed = pt.total THEN 'dispensed'
          ELSE status
        END
        FROM prescription_totals pt
        WHERE p.id = pt.prescription_id
      `, [dispensationId]);

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Récupérer une délivrance par ID
  static async findById(id) {
    const query = `
      SELECT d.*, 
             p.prescription_number,
             u.first_name, u.last_name
      FROM dispensations d
      JOIN prescriptions p ON d.prescription_id = p.id
      JOIN auth.users u ON d.patient_id = u.id
      WHERE d.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer par numéro
  static async findByNumber(dispensationNumber) {
    const query = 'SELECT * FROM dispensations WHERE dispensation_number = $1';
    const result = await db.query(query, [dispensationNumber]);
    return result.rows[0];
  }

  // Récupérer les délivrances d'un patient
  static async getByPatient(patientId) {
    const query = `
      SELECT d.*, 
             p.prescription_number,
             COUNT(di.id) as items_count
      FROM dispensations d
      JOIN prescriptions p ON d.prescription_id = p.id
      LEFT JOIN dispensation_items di ON d.id = di.dispensation_id
      WHERE d.patient_id = $1
      GROUP BY d.id, p.prescription_number
      ORDER BY d.dispensation_date DESC
    `;
    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  // Récupérer les délivrances d'une prescription
  static async getByPrescription(prescriptionId) {
    const query = `
      SELECT d.*, 
             COUNT(di.id) as items_count
      FROM dispensations d
      LEFT JOIN dispensation_items di ON d.id = di.dispensation_id
      WHERE d.prescription_id = $1
      GROUP BY d.id
      ORDER BY d.dispensation_date DESC
    `;
    const result = await db.query(query, [prescriptionId]);
    return result.rows;
  }

  // Récupérer les lignes d'une délivrance
  static async getItems(dispensationId) {
    const query = `
      SELECT di.*, 
             m.name, m.code, m.form, m.strength,
             mb.batch_number
      FROM dispensation_items di
      JOIN medications m ON di.medication_id = m.id
      JOIN medication_batches mb ON di.batch_id = mb.id
      WHERE di.dispensation_id = $1
    `;
    const result = await db.query(query, [dispensationId]);
    return result.rows;
  }

  // Statistiques des délivrances
  static async getStats(period = 'month') {
    const query = `
      SELECT 
        DATE_TRUNC($1, dispensation_date) as period,
        COUNT(*) as total_dispensations,
        COUNT(DISTINCT patient_id) as unique_patients,
        SUM(di.quantity) as total_items,
        SUM(di.total_price) as total_value
      FROM dispensations d
      JOIN dispensation_items di ON d.id = di.dispensation_id
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `;
    const result = await db.query(query, [period]);
    return result.rows;
  }
}

module.exports = Dispensation;