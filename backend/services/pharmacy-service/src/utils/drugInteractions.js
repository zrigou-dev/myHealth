const db = require('../config/database');

class DrugInteractions {
  // Vérifier les interactions entre médicaments
  static async checkInteractions(medicationIds) {
    if (medicationIds.length < 2) {
      return { severe: [], warnings: [] };
    }

    const severe = [];
    const warnings = [];

    for (let i = 0; i < medicationIds.length; i++) {
      for (let j = i + 1; j < medicationIds.length; j++) {
        const interaction = await this.getInteraction(
          medicationIds[i], 
          medicationIds[j]
        );

        if (interaction) {
          if (interaction.severity === 'severe' || interaction.severity === 'contraindicated') {
            severe.push(interaction);
          } else {
            warnings.push(interaction);
          }
        }
      }
    }

    return { severe, warnings };
  }

  // Récupérer l'interaction entre deux médicaments
  static async getInteraction(medId1, medId2) {
    const result = await db.query(`
      SELECT * FROM drug_interactions
      WHERE (medication_id_1 = $1 AND medication_id_2 = $2)
         OR (medication_id_1 = $2 AND medication_id_2 = $1)
    `, [medId1, medId2]);

    return result.rows[0];
  }

  // Ajouter une interaction
  static async addInteraction(interactionData) {
    const {
      medication_id_1, medication_id_2,
      severity, description, mechanism, recommendation
    } = interactionData;

    const query = `
      INSERT INTO drug_interactions (
        medication_id_1, medication_id_2,
        severity, description, mechanism, recommendation
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (medication_id_1, medication_id_2) 
      DO UPDATE SET
        severity = EXCLUDED.severity,
        description = EXCLUDED.description,
        mechanism = EXCLUDED.mechanism,
        recommendation = EXCLUDED.recommendation
      RETURNING *
    `;

    const values = [
      medication_id_1, medication_id_2,
      severity, description, mechanism, recommendation
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Obtenir toutes les interactions pour un médicament
  static async getInteractionsForMedication(medicationId) {
    const result = await db.query(`
      SELECT 
        di.*,
        m1.name as medication_1_name,
        m2.name as medication_2_name
      FROM drug_interactions di
      JOIN medications m1 ON di.medication_id_1 = m1.id
      JOIN medications m2 ON di.medication_id_2 = m2.id
      WHERE di.medication_id_1 = $1 OR di.medication_id_2 = $1
    `, [medicationId]);

    return result.rows;
  }
}

module.exports = DrugInteractions;