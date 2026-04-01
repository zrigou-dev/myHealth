class ReferenceRanges {
  // Vérifier si une valeur est dans les normes
  static checkValue(value, ranges, patientAge, patientGender) {
    if (!ranges) return { flag: 'normal', isAbnormal: false };

    try {
      const parsedRanges = typeof ranges === 'string' ? JSON.parse(ranges) : ranges;
      
      // Chercher la fourchette appropriée selon l'âge et le sexe
      let applicableRange = null;

      // Par âge
      if (parsedRanges.byAge && patientAge) {
        applicableRange = parsedRanges.byAge.find(range => 
          (!range.age_min || patientAge >= range.age_min) &&
          (!range.age_max || patientAge <= range.age_max) &&
          (!range.gender || range.gender === 'both' || range.gender === patientGender)
        );
      }

      // Par sexe
      if (!applicableRange && parsedRanges[patientGender]) {
        applicableRange = parsedRanges[patientGender];
      }

      // Par défaut
      if (!applicableRange && parsedRanges.normal) {
        applicableRange = parsedRanges.normal;
      }

      if (!applicableRange) {
        return { flag: 'normal', isAbnormal: false };
      }

      // Vérifier la valeur
      const { min, max, criticalMin, criticalMax } = applicableRange;

      if (criticalMin !== undefined && value < criticalMin) {
        return { flag: 'critical_low', isAbnormal: true };
      }
      if (criticalMax !== undefined && value > criticalMax) {
        return { flag: 'critical_high', isAbnormal: true };
      }
      if (min !== undefined && value < min) {
        return { flag: 'low', isAbnormal: true };
      }
      if (max !== undefined && value > max) {
        return { flag: 'high', isAbnormal: true };
      }

      return { flag: 'normal', isAbnormal: false };
    } catch (error) {
      console.error('Erreur vérification normes:', error);
      return { flag: 'normal', isAbnormal: false };
    }
  }

  // Obtenir la fourchette de référence formatée
  static getFormattedRange(ranges, patientAge, patientGender) {
    try {
      const parsedRanges = typeof ranges === 'string' ? JSON.parse(ranges) : ranges;
      
      let applicableRange = null;

      if (parsedRanges.byAge && patientAge) {
        applicableRange = parsedRanges.byAge.find(range => 
          (!range.age_min || patientAge >= range.age_min) &&
          (!range.age_max || patientAge <= range.age_max)
        );
      }

      if (!applicableRange && parsedRanges[patientGender]) {
        applicableRange = parsedRanges[patientGender];
      }

      if (!applicableRange && parsedRanges.normal) {
        applicableRange = parsedRanges.normal;
      }

      if (!applicableRange) return 'Non défini';

      const { min, max } = applicableRange;
      
      if (min !== undefined && max !== undefined) {
        return `${min} - ${max}`;
      } else if (min !== undefined) {
        return `> ${min}`;
      } else if (max !== undefined) {
        return `< ${max}`;
      }

      return 'Non défini';
    } catch (error) {
      return 'Non défini';
    }
  }

  // Obtenir les normes par test et population
  static async getRangesByTest(testId, pool) {
    const query = `
      SELECT * FROM reference_ranges_by_age
      WHERE test_id = $1
      ORDER BY age_min_months
    `;
    const result = await pool.query(query, [testId]);
    return result.rows;
  }

  // Ajouter une norme
  static async addRange(rangeData, pool) {
    const {
      test_id, age_min_months, age_max_months,
      gender, min_value, max_value, unit
    } = rangeData;

    const query = `
      INSERT INTO reference_ranges_by_age (
        test_id, age_min_months, age_max_months,
        gender, min_value, max_value, unit
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      test_id, age_min_months, age_max_months,
      gender, min_value, max_value, unit
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = ReferenceRanges;