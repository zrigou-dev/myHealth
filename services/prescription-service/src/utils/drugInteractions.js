const db = require('../config/database');

class DrugInteractions {
  // Vérifier les interactions entre médicaments
  static async checkInteractions(medicationIds) {
    if (medicationIds.length < 2) {
      return { severe: [], warnings: [] };
    }

    const severe = [];
    const warnings = [];

    // Vérifier dans le cache local d'abord
    for (let i = 0; i < medicationIds.length; i++) {
      for (let j = i + 1; j < medicationIds.length; j++) {
        const interaction = await this.getInteractionFromCache(
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

  // Récupérer l'interaction depuis le cache
  static async getInteractionFromCache(medId1, medId2) {
    const result = await db.query(`
      SELECT * FROM prescription_interactions_cache
      WHERE (medication_id_1 = $1 AND medication_id_2 = $2)
         OR (medication_id_1 = $2 AND medication_id_2 = $1)
    `, [medId1, medId2]);

    return result.rows[0];
  }

  // Mettre en cache une interaction
  static async cacheInteraction(medId1, medId2, severity, description) {
    const query = `
      INSERT INTO prescription_interactions_cache (
        medication_id_1, medication_id_2, severity, description
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (medication_id_1, medication_id_2) 
      DO UPDATE SET
        severity = EXCLUDED.severity,
        description = EXCLUDED.description,
        checked_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await db.query(query, [medId1, medId2, severity, description]);
    return result.rows[0];
  }
}

module.exports = DrugInteractions;