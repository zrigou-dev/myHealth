const db = require('../config/database');

class PrescriptionItem {
  // Récupérer un item par ID
  static async findById(id) {
    const query = `
      SELECT pi.*, p.prescription_number, p.patient_id, p.doctor_id
      FROM prescription_items pi
      JOIN prescriptions p ON pi.prescription_id = p.id
      WHERE pi.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer les items d'une prescription
  static async getByPrescription(prescriptionId) {
    const query = `
      SELECT * FROM prescription_items 
      WHERE prescription_id = $1
      ORDER BY id
    `;
    const result = await db.query(query, [prescriptionId]);
    return result.rows;
  }

  // Mettre à jour un item
  static async update(id, itemData) {
    const {
      dosage_value, dosage_unit, dosage_form, strength,
      frequency_value, frequency_unit, frequency_detail,
      duration_value, duration_unit,
      quantity, quantity_unit, instructions, indications,
      substitution_allowed, unit_price
    } = itemData;

    const total_price = unit_price && quantity ? quantity * unit_price : null;

    const query = `
      UPDATE prescription_items 
      SET dosage_value = COALESCE($1, dosage_value),
          dosage_unit = COALESCE($2, dosage_unit),
          dosage_form = COALESCE($3, dosage_form),
          strength = COALESCE($4, strength),
          frequency_value = COALESCE($5, frequency_value),
          frequency_unit = COALESCE($6, frequency_unit),
          frequency_detail = COALESCE($7, frequency_detail),
          duration_value = COALESCE($8, duration_value),
          duration_unit = COALESCE($9, duration_unit),
          quantity = COALESCE($10, quantity),
          quantity_unit = COALESCE($11, quantity_unit),
          instructions = COALESCE($12, instructions),
          indications = COALESCE($13, indications),
          substitution_allowed = COALESCE($14, substitution_allowed),
          unit_price = COALESCE($15, unit_price),
          total_price = COALESCE($16, total_price)
      WHERE id = $17
      RETURNING *
    `;

    const values = [
      dosage_value, dosage_unit, dosage_form, strength,
      frequency_value, frequency_unit, frequency_detail,
      duration_value, duration_unit,
      quantity, quantity_unit, instructions, indications,
      substitution_allowed, unit_price, total_price, id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Supprimer un item
  static async delete(id) {
    const query = 'DELETE FROM prescription_items WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Vérifier la disponibilité (via pharmacy service)
  static async checkAvailability(itemId, pharmacyService) {
    const item = await this.findById(itemId);
    if (!item) return null;

    // Appeler le service pharmacie pour vérifier le stock
    try {
      const available = await pharmacyService.checkMedicationAvailability(
        item.medication_id,
        item.quantity - item.quantity_dispensed
      );
      return {
        item_id: itemId,
        medication_id: item.medication_id,
        medication_name: item.medication_name,
        required: item.quantity - item.quantity_dispensed,
        available
      };
    } catch (error) {
      console.error('Erreur vérification disponibilité:', error);
      return null;
    }
  }

  // Obtenir le résumé d'une prescription
  static async getPrescriptionSummary(prescriptionId) {
    const query = `
      SELECT 
        COUNT(*) as total_items,
        SUM(quantity) as total_quantity,
        SUM(quantity_dispensed) as total_dispensed,
        SUM(CASE WHEN quantity_dispensed < quantity THEN 1 ELSE 0 END) as pending_items,
        SUM(total_price) as total_price
      FROM prescription_items
      WHERE prescription_id = $1
    `;
    const result = await db.query(query, [prescriptionId]);
    return result.rows[0];
  }
}

module.exports = PrescriptionItem;