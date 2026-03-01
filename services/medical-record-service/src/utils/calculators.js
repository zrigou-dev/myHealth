class MedicalCalculators {
  // Calculer l'IMC
  static calculateBMI(height, weight) {
    if (!height || !weight || height <= 0) return null;
    const heightInM = height / 100;
    return parseFloat((weight / (heightInM * heightInM)).toFixed(1));
  }

  // Interpréter l'IMC
  static interpretBMI(bmi) {
    if (!bmi) return 'Non disponible';
    if (bmi < 16.5) return 'Dénutrition';
    if (bmi < 18.5) return 'Maigreur';
    if (bmi < 25) return 'Corpulence normale';
    if (bmi < 30) return 'Surpoids';
    if (bmi < 35) return 'Obésité modérée';
    if (bmi < 40) return 'Obésité sévère';
    return 'Obésité morbide';
  }

  // Interpréter la tension artérielle
  static interpretBloodPressure(systolic, diastolic) {
    if (!systolic || !diastolic) return 'Non disponible';
    
    if (systolic < 120 && diastolic < 80) return 'Optimale';
    if (systolic < 130 && diastolic < 80) return 'Normale';
    if (systolic < 140 && diastolic < 90) return 'Normale haute';
    if (systolic < 160 && diastolic < 100) return 'Hypertension légère (stade 1)';
    if (systolic < 180 && diastolic < 110) return 'Hypertension modérée (stade 2)';
    if (systolic >= 180 || diastolic >= 110) return 'Hypertension sévère (stade 3)';
    
    return 'Non classifié';
  }

  // Interpréter la fréquence cardiaque
  static interpretHeartRate(rate, age) {
    if (!rate) return 'Non disponible';
    
    if (age < 1) {
      if (rate < 100) return 'Bradycardie';
      if (rate < 160) return 'Normale';
      return 'Tachycardie';
    }
    if (age < 12) {
      if (rate < 70) return 'Bradycardie';
      if (rate < 120) return 'Normale';
      return 'Tachycardie';
    }
    // Adulte
    if (rate < 60) return 'Bradycardie';
    if (rate < 100) return 'Normale';
    return 'Tachycardie';
  }

  // Interpréter la température
  static interpretTemperature(temp) {
    if (!temp) return 'Non disponible';
    
    if (temp < 35) return 'Hypothermie sévère';
    if (temp < 36) return 'Hypothermie légère';
    if (temp < 37.5) return 'Normale';
    if (temp < 38) return 'Subfébrile';
    if (temp < 39) return 'Fièvre modérée';
    if (temp < 40) return 'Fièvre élevée';
    return 'Fièvre très élevée';
  }

  // Interpréter la saturation en oxygène
  static interpretOxygenSaturation(sat) {
    if (!sat) return 'Non disponible';
    
    if (sat >= 95) return 'Normale';
    if (sat >= 90) return 'Hypoxémie légère';
    if (sat >= 85) return 'Hypoxémie modérée';
    return 'Hypoxémie sévère';
  }

  // Calculer l'âge à partir de la date de naissance
  static calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // Calculer la surface corporelle (formule de Dubois)
  static calculateBodySurfaceArea(height, weight) {
    if (!height || !weight) return null;
    return Math.sqrt((height * weight) / 3600).toFixed(2);
  }

  // Calculer le débit de filtration glomérulaire (formule MDRD)
  static calculateGFR(creatinine, age, isMale) {
    if (!creatinine || !age) return null;
    let gfr = 175 * Math.pow(creatinine / 88.4, -1.154) * Math.pow(age, -0.203);
    if (!isMale) {
      gfr *= 0.742;
    }
    return Math.round(gfr);
  }

  // Interpréter le DFG
  static interpretGFR(gfr) {
    if (!gfr) return 'Non disponible';
    if (gfr >= 90) return 'Stade 1 : Normal ou hyperfiltration';
    if (gfr >= 60) return 'Stade 2 : Insuffisance rénale légère';
    if (gfr >= 30) return 'Stade 3 : Insuffisance rénale modérée';
    if (gfr >= 15) return 'Stade 4 : Insuffisance rénale sévère';
    return 'Stade 5 : Insuffisance rénale terminale';
  }

  // Calculer les percentiles de croissance (simplifié)
  static calculateGrowthPercentile(height, age, gender) {
    // Tables simplifiées - à remplacer par des vraies courbes de croissance
    const percentiles = {
      male: {
        2: { p3: 82, p50: 87, p97: 94 },
        5: { p3: 100, p50: 110, p97: 120 },
        10: { p3: 128, p50: 138, p97: 148 }
      },
      female: {
        2: { p3: 80, p50: 86, p97: 92 },
        5: { p3: 99, p50: 109, p97: 118 },
        10: { p3: 128, p50: 138, p97: 148 }
      }
    };

    const ageGroup = percentiles[gender]?.[age];
    if (!ageGroup) return null;

    if (height < ageGroup.p3) return '< 3ème percentile';
    if (height < ageGroup.p50) return 'Entre 3ème et 50ème percentile';
    if (height < ageGroup.p97) return 'Entre 50ème et 97ème percentile';
    return '> 97ème percentile';
  }

  // Calculer la pression artérielle moyenne (PAM)
  static calculateMAP(systolic, diastolic) {
    if (!systolic || !diastolic) return null;
    return Math.round((systolic + 2 * diastolic) / 3);
  }

  // Calculer la variation de poids
  static calculateWeightChange(previousWeight, currentWeight, days) {
    if (!previousWeight || !currentWeight || !days) return null;
    
    const change = currentWeight - previousWeight;
    const dailyChange = change / days;
    const percentageChange = (change / previousWeight) * 100;
    
    return {
      change: parseFloat(change.toFixed(1)),
      daily_change: parseFloat(dailyChange.toFixed(2)),
      percentage: parseFloat(percentageChange.toFixed(1)),
      interpretation: percentageChange > 5 ? 'Perte de poids significative' : 'Stable'
    };
  }
}

module.exports = MedicalCalculators;