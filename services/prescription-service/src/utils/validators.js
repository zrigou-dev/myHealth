const moment = require('moment');

class Validators {
  // Valider un email
  static isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Valider un numéro de téléphone (format français)
  static isValidPhone(phone) {
    const re = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    return re.test(phone);
  }

  // Valider une date de prescription
  static isValidPrescriptionDate(date) {
    const d = moment(date);
    return d.isValid() && d.isSameOrAfter(moment().startOf('day'));
  }

  // Valider une date d'expiration
  static isValidExpiryDate(date, prescriptionDate = null) {
    const d = moment(date);
    const pDate = prescriptionDate ? moment(prescriptionDate) : moment();
    return d.isValid() && d.isAfter(pDate);
  }

  // Valider un dosage
  static isValidDosage(dosage, medication) {
    // Règles métier spécifiques
    const maxDosages = {
      1: 4000, // Paracétamol: max 4000mg/jour
      2: 3000, // Amoxicilline
      3: 2400, // Ibuprofène
    };

    const maxDosage = maxDosages[medication] || 5000;
    return dosage <= maxDosage;
  }

  // Valider une quantité
  static isValidQuantity(quantity, maxQuantity = 1000) {
    return quantity > 0 && quantity <= maxQuantity;
  }

  // Valider une fréquence
  static isValidFrequency(frequency, unit) {
    const maxFrequencies = {
      'hour': 24,
      'day': 10,
      'week': 70,
      'month': 300
    };

    const maxFreq = maxFrequencies[unit] || 100;
    return frequency > 0 && frequency <= maxFreq;
  }

  // Valider une durée de traitement
  static isValidDuration(duration, unit) {
    const maxDurations = {
      'day': 365,
      'week': 52,
      'month': 12
    };

    const maxDur = maxDurations[unit] || 365;
    return duration > 0 && duration <= maxDur;
  }

  // Valider un numéro de sécurité sociale (France)
  static isValidSocialSecurityNumber(ssn) {
    const re = /^[12]\d{2}(0[1-9]|1[0-2])\d{5}\d{2}$/;
    return re.test(ssn);
  }

  // Valider un numéro RPPS (médecin)
  static isValidRPPS(rpps) {
    const re = /^\d{11}$/;
    return re.test(rpps);
  }

  // Valider un code CIP (médicament)
  static isValidCIP(code) {
    const re = /^\d{7,13}$/;
    return re.test(code);
  }

  // Vérifier si c'est une substance contrôlée
  static isControlledSubstance(medicationCode) {
    const controlledCodes = ['MORPH', 'OXYC', 'FENTA']; // Liste des codes de substances contrôlées
    return controlledCodes.includes(medicationCode);
  }

  // Calculer la quantité totale pour une prescription
  static calculateTotalQuantity(frequency, frequencyUnit, duration, durationUnit) {
    let multiplier = 1;
    
    // Convertir la fréquence en fois par jour
    switch (frequencyUnit) {
      case 'hour':
        multiplier = 24 / frequency;
        break;
      case 'day':
        multiplier = frequency;
        break;
      case 'week':
        multiplier = frequency / 7;
        break;
      case 'month':
        multiplier = frequency / 30;
        break;
    }

    // Convertir la durée en jours
    let days = duration;
    switch (durationUnit) {
      case 'week':
        days = duration * 7;
        break;
      case 'month':
        days = duration * 30;
        break;
    }

    return Math.ceil(multiplier * days);
  }

  // Valider que tous les champs requis sont présents
  static validateRequiredFields(data, requiredFields) {
    const missing = [];
    requiredFields.forEach(field => {
      if (!data[field] && data[field] !== 0) {
        missing.push(field);
      }
    });
    return missing;
  }

  // Nettoyer et normaliser les données
  static sanitizePrescriptionData(data) {
    const sanitized = { ...data };

    // Normaliser les chaînes
    if (sanitized.diagnosis) {
      sanitized.diagnosis = sanitized.diagnosis.trim();
    }
    if (sanitized.patient_instructions) {
      sanitized.patient_instructions = sanitized.patient_instructions.trim();
    }

    // Normaliser les nombres
    if (sanitized.renewals_allowed) {
      sanitized.renewals_allowed = Math.min(sanitized.renewals_allowed, 10);
    }

    return sanitized;
  }

  // Vérifier les conflits de médicaments
  static checkMedicationConflicts(items) {
    const conflicts = [];
    const medicationSet = new Set();

    items.forEach(item => {
      if (medicationSet.has(item.medication_id)) {
        conflicts.push({
          type: 'duplicate',
          medication_id: item.medication_id,
          medication_name: item.medication_name,
          message: 'Médicament prescrit plusieurs fois'
        });
      }
      medicationSet.add(item.medication_id);
    });

    return conflicts;
  }
}

module.exports = Validators;