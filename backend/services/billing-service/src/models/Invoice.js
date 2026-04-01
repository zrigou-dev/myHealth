const db = require('../config/database');
const moment = require('moment');

class Invoice {
  // Créer une nouvelle facture
  static async create(invoiceData) {
    const {
      patient_id, doctor_id, appointment_id,
      subtotal, tax_amount, total_amount,
      consultation_fee, procedure_fees, medication_fees,
      additional_charges, notes, terms, created_by
    } = invoiceData;

    const due_date = moment().add(process.env.INVOICE_DUE_DAYS || 30, 'days').format('YYYY-MM-DD');

    const query = `
      INSERT INTO invoices (
        patient_id, doctor_id, appointment_id,
        invoice_date, due_date,
        subtotal, tax_amount, total_amount,
        consultation_fee, procedure_fees, medication_fees,
        additional_charges, notes, terms, created_by,
        status, amount_paid
      )
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'draft', 0)
      RETURNING *
    `;

    const values = [
      patient_id, doctor_id, appointment_id,
      due_date,
      subtotal, tax_amount, total_amount,
      consultation_fee, procedure_fees || '[]', medication_fees || '[]',
      additional_charges || '[]', notes, terms, created_by
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Créer une facture depuis un rendez-vous
  static async createFromAppointment(appointmentData, doctorData, patientData) {
    // Calculer les montants
    const consultation_fee = doctorData.consultation_fee || 50;
    const subtotal = consultation_fee;
    const tax_amount = subtotal * (process.env.VAT_RATE / 100);
    const total_amount = subtotal + tax_amount;

    return this.create({
      patient_id: appointmentData.patient_id,
      doctor_id: appointmentData.doctor_id,
      appointment_id: appointmentData.id,
      subtotal,
      tax_amount,
      total_amount,
      consultation_fee,
      procedure_fees: [],
      medication_fees: [],
      notes: `Facture pour consultation du ${moment(appointmentData.appointment_date).format('DD/MM/YYYY')}`,
      created_by: appointmentData.patient_id
    });
  }

  // Récupérer une facture par ID
  static async findById(id) {
    const query = 'SELECT * FROM invoices WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer par numéro de facture
  static async findByNumber(invoiceNumber) {
    const query = 'SELECT * FROM invoices WHERE invoice_number = $1';
    const result = await db.query(query, [invoiceNumber]);
    return result.rows[0];
  }

  // Récupérer les factures d'un patient
  static async getByPatient(patientId, status = null) {
    let query = 'SELECT * FROM invoices WHERE patient_id = $1';
    const values = [patientId];

    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, values);
    return result.rows;
  }

  // Récupérer les factures d'un médecin
  static async getByDoctor(doctorId, status = null) {
    let query = 'SELECT * FROM invoices WHERE doctor_id = $1';
    const values = [doctorId];

    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, values);
    return result.rows;
  }

  // Mettre à jour le statut
  static async updateStatus(id, status, paymentDetails = null) {
    const query = `
      UPDATE invoices 
      SET status = $2,
          ${status === 'paid' ? 'paid_at = CURRENT_TIMESTAMP,' : ''}
          payment_details = COALESCE($3, payment_details),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id, status, paymentDetails]);
    return result.rows[0];
  }

  // Enregistrer un paiement
  static async addPayment(invoiceId, paymentData) {
    const { amount, payment_method, transaction_id, notes, received_by } = paymentData;

    // Commencer une transaction
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Ajouter le paiement
      const paymentQuery = `
        INSERT INTO payments (
          invoice_id, patient_id, amount, payment_method,
          transaction_id, notes, received_by, payment_status
        )
        SELECT $1, patient_id, $2, $3, $4, $5, $6, 'completed'
        FROM invoices WHERE id = $1
        RETURNING *
      `;

      const paymentResult = await client.query(paymentQuery, [
        invoiceId, amount, payment_method, transaction_id, notes, received_by
      ]);

      // Mettre à jour la facture
      const updateQuery = `
        UPDATE invoices 
        SET amount_paid = amount_paid + $2,
            status = CASE 
              WHEN amount_paid + $2 >= total_amount THEN 'paid'
              WHEN amount_paid + $2 > 0 THEN 'partially_paid'
              ELSE status
            END,
            payment_method = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const invoiceResult = await client.query(updateQuery, [invoiceId, amount, payment_method]);

      await client.query('COMMIT');

      return {
        payment: paymentResult.rows[0],
        invoice: invoiceResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtenir les statistiques
  static async getStats(doctorId = null, startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as total_overdue,
        SUM(CASE WHEN status IN ('draft', 'sent') THEN total_amount ELSE 0 END) as total_pending,
        AVG(total_amount) as average_invoice_amount,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
      FROM invoices
      WHERE 1=1
    `;
    const values = [];

    if (doctorId) {
      query += ` AND doctor_id = $${values.length + 1}`;
      values.push(doctorId);
    }

    if (startDate) {
      query += ` AND invoice_date >= $${values.length + 1}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND invoice_date <= $${values.length + 1}`;
      values.push(endDate);
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Générer le PDF (à implémenter avec PDFKit)
  static async generatePdf(invoiceId) {
    // Cette méthode sera implémentée avec PDFKit
    // Retourne le buffer du PDF
    return Buffer.from('PDF content');
  }

  // Marquer comme envoyée
  static async markAsSent(id) {
    const query = `
      UPDATE invoices 
      SET status = 'sent',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'draft'
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Vérifier les factures en retard (pour cron job)
  static async checkOverdueInvoices() {
    const query = `
      UPDATE invoices 
      SET status = 'overdue'
      WHERE due_date < CURRENT_DATE 
        AND status IN ('sent', 'partially_paid')
      RETURNING id, invoice_number, patient_id, amount_due
    `;
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = Invoice;