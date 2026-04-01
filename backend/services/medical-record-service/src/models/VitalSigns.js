const { pg } = require('../config/database');

class VitalSigns {
  // Ajouter des constantes
  static async create(vitalData) {
    const {
      patient_id, recorded_by,
      height, weight,
      systolic_bp, diastolic_bp,
      heart_rate, respiratory_rate,
      temperature, oxygen_saturation,
      blood_glucose, notes
    } = vitalData;

    const query = `
      INSERT INTO vital_signs (
        patient_id, recorded_by,
        height, weight,
        systolic_bp, diastolic_bp,
        heart_rate, respiratory_rate,
        temperature, oxygen_saturation,
        blood_glucose, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      patient_id, recorded_by,
      height, weight,
      systolic_bp, diastolic_bp,
      heart_rate, respiratory_rate,
      temperature, oxygen_saturation,
      blood_glucose, notes
    ];

    const result = await pg.query(query, values);
    return result.rows[0];
  }

  // Récupérer l'historique des constantes
  static async getHistory(patientId, limit = 20) {
    const query = `
      SELECT * FROM vital_signs 
      WHERE patient_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2
    `;
    const result = await pg.query(query, [patientId, limit]);
    return result.rows;
  }

  // Récupérer les dernières constantes
  static async getLatest(patientId) {
    const query = `
      SELECT * FROM vital_signs 
      WHERE patient_id = $1
      ORDER BY recorded_at DESC
      LIMIT 1
    `;
    const result = await pg.query(query, [patientId]);
    return result.rows[0];
  }

  // Calculer l'IMC
  static calculateBMI(height, weight) {
    if (!height || !weight || height <= 0) return null;
    const heightInM = height / 100;
    return parseFloat((weight / (heightInM * heightInM)).toFixed(1));
  }

  // Interpréter l'IMC
  static interpretBMI(bmi) {
    if (!bmi) return 'Non disponible';
    if (bmi < 18.5) return 'Insuffisance pondérale';
    if (bmi < 25) return 'Corpulence normale';
    if (bmi < 30) return 'Surpoids';
    if (bmi < 35) return 'Obésité modérée';
    if (bmi < 40) return 'Obésité sévère';
    return 'Obésité morbide';
  }

  // Interpréter la tension
  static interpretBP(systolic, diastolic) {
    if (!systolic || !diastolic) return 'Non disponible';
    
    if (systolic < 120 && diastolic < 80) return 'Normale';
    if (systolic < 130 && diastolic < 80) return 'Élevée';
    if (systolic < 140 || diastolic < 90) return 'Hypertension stade 1';
    if (systolic >= 140 || diastolic >= 90) return 'Hypertension stade 2';
    if (systolic > 180 || diastolic > 120) return 'Crise hypertensive';
    
    return 'Normale';
  }

  // Statistiques
  static async getStats(patientId, days = 30) {
    const query = `
      SELECT 
        AVG(systolic_bp) as avg_systolic,
        AVG(diastolic_bp) as avg_diastolic,
        AVG(heart_rate) as avg_heart_rate,
        AVG(blood_glucose) as avg_glucose,
        MIN(recorded_at) as first_record,
        MAX(recorded_at) as last_record,
        COUNT(*) as total_records
      FROM vital_signs
      WHERE patient_id = $1
        AND recorded_at > NOW() - INTERVAL '${days} days'
    `;
    const result = await pg.query(query, [patientId]);
    return result.rows[0];
  }
}

module.exports = VitalSigns;