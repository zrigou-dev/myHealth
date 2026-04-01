const db = require('../config/database');

class Insurance {
  // Créer une nouvelle demande d'assurance
  static async createClaim(claimData) {
    const {
      invoice_id, patient_id, insurance_provider,
      policy_number, claim_amount, documents, notes
    } = claimData;

    // Générer un numéro de demande
    const claim_number = 'CLAIM-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    const query = `
      INSERT INTO insurance_claims (
        claim_number, invoice_id, patient_id, insurance_provider,
        policy_number, claim_amount, documents, notes,
        status, submission_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted', CURRENT_DATE)
      RETURNING *
    `;

    const values = [
      claim_number, invoice_id, patient_id, insurance_provider,
      policy_number, claim_amount, documents || '[]', notes
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Récupérer les demandes d'un patient
  static async getByPatient(patientId) {
    const query = `
      SELECT c.*, i.invoice_number 
      FROM insurance_claims c
      LEFT JOIN invoices i ON c.invoice_id = i.id
      WHERE c.patient_id = $1 
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query, [patientId]);
    return result.rows;
  }

  // Récupérer une demande par numéro
  static async findByNumber(claimNumber) {
    const query = 'SELECT * FROM insurance_claims WHERE claim_number = $1';
    const result = await db.query(query, [claimNumber]);
    return result.rows[0];
  }

  // Mettre à jour le statut d'une demande
  static async updateStatus(id, status, approvedAmount = null) {
    const query = `
      UPDATE insurance_claims 
      SET status = $2,
          approved_amount = COALESCE($3, approved_amount),
          ${status === 'approved' ? 'approval_date = CURRENT_DATE,' : ''}
          ${status === 'paid' ? 'payment_date = CURRENT_DATE,' : ''}
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id, status, approvedAmount]);
    return result.rows[0];
  }

  // Récupérer les demandes en attente
  static async getPendingClaims() {
    const query = `
      SELECT c.*, i.invoice_number, i.total_amount 
      FROM insurance_claims c
      JOIN invoices i ON c.invoice_id = i.id
      WHERE c.status = 'submitted'
      ORDER BY c.submission_date
    `;
    const result = await db.query(query);
    return result.rows;
  }

  // Statistiques des assurances
  static async getStats(insuranceProvider = null) {
    let query = `
      SELECT 
        COUNT(*) as total_claims,
        SUM(claim_amount) as total_claimed,
        SUM(CASE WHEN status = 'approved' THEN approved_amount ELSE 0 END) as total_approved,
        SUM(CASE WHEN status = 'paid' THEN approved_amount ELSE 0 END) as total_paid,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_claims,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_claims,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_claims
      FROM insurance_claims
      WHERE 1=1
    `;
    const values = [];

    if (insuranceProvider) {
      query += ` AND insurance_provider = $1`;
      values.push(insuranceProvider);
    }

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = Insurance;