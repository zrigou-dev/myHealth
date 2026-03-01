const db = require("../config/database");
const moment = require("moment");

class Stock {
  // Ajouter un lot
  static async addBatch(batchData) {
    const {
      medication_id,
      batch_number,
      expiry_date,
      quantity,
      purchase_price,
      selling_price,
      location,
    } = batchData;

    const query = `
      INSERT INTO medication_batches (
        medication_id, batch_number, expiry_date,
        quantity, initial_quantity, purchase_price,
        selling_price, location, received_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)
      RETURNING *
    `;

    const values = [
      medication_id,
      batch_number,
      expiry_date,
      quantity,
      quantity,
      purchase_price,
      selling_price,
      location,
    ];

    const result = await db.query(query, values);

    // Vérifier le niveau de stock
    await this.checkStockLevel(medication_id);

    return result.rows[0];
  }

  // Mettre à jour la quantité (après délivrance)
  static async updateQuantity(batchId, quantityChange) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
        UPDATE medication_batches 
        SET quantity = quantity + $2
        WHERE id = $1
        RETURNING *
      `,
        [batchId, quantityChange],
      );

      if (result.rows[0]) {
        await this.checkStockLevel(result.rows[0].medication_id);
        await this.checkExpiryDate(result.rows[0].medication_id);
      }

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Vérifier le niveau de stock
  static async checkStockLevel(medicationId) {
    const threshold = process.env.LOW_STOCK_THRESHOLD || 10;

    const result = await db.query(
      `
      SELECT COALESCE(SUM(quantity), 0) as total_quantity
      FROM medication_batches
      WHERE medication_id = $1 AND is_active = true
    `,
      [medicationId],
    );

    const totalQuantity = parseInt(result.rows[0].total_quantity);

    if (totalQuantity <= threshold) {
      // Créer une alerte de stock faible
      await db.query(
        `
        INSERT INTO stock_alerts (
          medication_id, alert_type, threshold_value,
          current_value, message
        )
        VALUES ($1, 'low_stock', $2, $3, $4)
      `,
        [
          medicationId,
          threshold,
          totalQuantity,
          `Stock faible: ${totalQuantity} unités restantes (seuil: ${threshold})`,
        ],
      );
    }

    return totalQuantity;
  }

  // Vérifier les dates d'expiration
  static async checkExpiryDate(medicationId) {
    const warningDays = process.env.EXPIRY_WARNING_DAYS || 30;
    const today = moment().format("YYYY-MM-DD");
    const warningDate = moment().add(warningDays, "days").format("YYYY-MM-DD");

    const result = await db.query(
      `
      SELECT * FROM medication_batches
      WHERE medication_id = $1
        AND expiry_date <= $2
        AND expiry_date >= $3
        AND is_active = true
    `,
      [medicationId, warningDate, today],
    );

    for (const batch of result.rows) {
      await db.query(
        `
        INSERT INTO stock_alerts (
          medication_id, batch_id, alert_type,
          current_value, message
        )
        VALUES ($1, $2, 'expiring', $3, $4)
      `,
        [
          medicationId,
          batch.id,
          batch.quantity,
          `Lot ${batch.batch_number} expire le ${moment(batch.expiry_date).format("DD/MM/YYYY")}`,
        ],
      );
    }

    return result.rows;
  }

  // Obtenir le stock d'un médicament
  static async getStock(medicationId) {
    const query = `
      SELECT 
        mb.*,
        m.name,
        m.code
      FROM medication_batches mb
      JOIN medications m ON mb.medication_id = m.id
      WHERE mb.medication_id = $1
      ORDER BY mb.expiry_date
    `;
    const result = await db.query(query, [medicationId]);
    return result.rows;
  }

  // Obtenir tous les stocks avec alertes
  static async getAllStock() {
    const query = `
      SELECT 
        m.id,
        m.name,
        m.code,
        COALESCE(SUM(mb.quantity), 0) as total_quantity,
        COUNT(mb.id) as batch_count,
        MIN(mb.expiry_date) as nearest_expiry
      FROM medications m
      LEFT JOIN medication_batches mb ON m.id = mb.medication_id
      WHERE m.is_active = true
      GROUP BY m.id
      ORDER BY m.name
    `;
    const result = await db.query(query);
    return result.rows;
  }

  // Obtenir les alertes
  static async getAlerts(resolved = false) {
    const query = `
      SELECT sa.*, m.name, m.code
      FROM stock_alerts sa
      JOIN medications m ON sa.medication_id = m.id
      WHERE sa.is_resolved = $1
      ORDER BY sa.created_at DESC
    `;
    const result = await db.query(query, [resolved]);
    return result.rows;
  }

  // Résoudre une alerte
  static async resolveAlert(alertId) {
    const query = `
      UPDATE stock_alerts 
      SET is_resolved = true, resolved_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [alertId]);
    return result.rows[0];
  }

  // Vérifier la disponibilité
  static async checkAvailability(medicationId, quantity) {
    const result = await db.query(
      `
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM medication_batches
      WHERE medication_id = $1
        AND expiry_date > CURRENT_DATE
        AND is_active = true
    `,
      [medicationId],
    );

    return parseInt(result.rows[0].total) >= quantity;
  }
}

module.exports = Stock;
