const db = require("../config/database");

class Payment {
  // Récupérer un paiement par ID (utilisé pour remboursement)
  static async findById(id) {
    const query = "SELECT * FROM payments WHERE id = $1";
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Créer un nouveau paiement
  static async create(paymentData) {
    const {
      invoice_id,
      patient_id,
      amount,
      payment_method,
      transaction_id,
      stripe_payment_intent_id,
      card_last4,
      card_brand,
      bank_name,
      cheque_number,
      notes,
      received_by,
    } = paymentData;

    const query = `
      INSERT INTO payments (
        invoice_id, patient_id, amount, payment_method,
        transaction_id, stripe_payment_intent_id,
        card_last4, card_brand, bank_name, cheque_number,
        notes, received_by, payment_status, payment_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'completed', CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      invoice_id,
      patient_id,
      amount,
      payment_method,
      transaction_id,
      stripe_payment_intent_id,
      card_last4,
      card_brand,
      bank_name,
      cheque_number,
      notes,
      received_by,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Récupérer les paiements d'une facture
  static async getByInvoice(invoiceId) {
    const query = `
      SELECT * FROM payments 
      WHERE invoice_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [invoiceId]);
    return result.rows;
  }

  // Récupérer les paiements d'un patient
  static async getByPatient(patientId) {
    const query = `
      SELECT p.*, i.invoice_number 
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.patient_id = $1 
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  // Récupérer un paiement par UUID
  static async findByUuid(uuid) {
    const query = "SELECT * FROM payments WHERE payment_uuid = $1";
    const result = await db.query(query, [uuid]);
    return result.rows[0];
  }

  // Récupérer un paiement par transaction ID (Stripe)
  static async findByTransactionId(transactionId) {
    const query = "SELECT * FROM payments WHERE transaction_id = $1";
    const result = await db.query(query, [transactionId]);
    return result.rows[0];
  }

  // Mettre à jour le statut d'un paiement
  static async updateStatus(id, status, details = null) {
    const query = `
      UPDATE payments 
      SET payment_status = $2,
          payment_details = COALESCE($3, payment_details)
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, status, details]);
    return result.rows[0];
  }

  // Statistiques des paiements
  static async getStats(doctorId = null, startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        COUNT(DISTINCT patient_id) as unique_patients,
        payment_method,
        COUNT(*) as method_count,
        SUM(amount) as method_total
      FROM payments
      WHERE 1=1
    `;
    const values = [];

    if (doctorId) {
      query += ` AND doctor_id = $${values.length + 1}`;
      values.push(doctorId);
    }

    if (startDate) {
      query += ` AND payment_date >= $${values.length + 1}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND payment_date <= $${values.length + 1}`;
      values.push(endDate);
    }

    query += " GROUP BY payment_method";

    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = Payment;
