const { body } = require('express-validator');

// Validateur pour plage de dates
const validateDateRange = (startDateField, endDateField) => {
  return body(endDateField).custom((endDate, { req }) => {
    if (!req.body[startDateField] || !endDate) return true;
    
    const start = new Date(req.body[startDateField]);
    const end = new Date(endDate);
    
    if (end < start) {
      throw new Error('La date de fin doit être postérieure à la date de début');
    }
    
    return true;
  });
};

// Validateur pour IMC
const validateBMI = (heightField, weightField) => {
  return body().custom((_, { req }) => {
    const height = req.body[heightField];
    const weight = req.body[weightField];
    
    if (height && weight) {
      const heightInM = height / 100;
      const bmi = weight / (heightInM * heightInM);
      
      if (bmi < 10 || bmi > 60) {
        throw new Error('L\'IMC calculé est hors des limites plausibles (10-60)');
      }
    }
    
    return true;
  });
};

// Validateur pour tension artérielle
const validateBloodPressure = () => {
  return body().custom((_, { req }) => {
    const systolic = req.body.systolic_bp;
    const diastolic = req.body.diastolic_bp;
    
    if (systolic && diastolic && systolic <= diastolic) {
      throw new Error('La pression systolique doit être supérieure à la diastolique');
    }
    
    return true;
  });
};

// Validateur pour médicaments
const validateMedication = [
  body('medications.*.name')
    .notEmpty()
    .withMessage('Nom du médicament requis'),
  body('medications.*.dosage')
    .matches(/^\d+\s*(mg|g|µg|ml)$/i)
    .withMessage('Format de dosage invalide (ex: 500mg, 1g)'),
  body('medications.*.frequency')
    .matches(/^\d+\s*(fois\/jour|jour|semaine)$/i)
    .withMessage('Format de fréquence invalide')
];

module.exports = {
  validateDateRange,
  validateBMI,
  validateBloodPressure,
  validateMedication
};