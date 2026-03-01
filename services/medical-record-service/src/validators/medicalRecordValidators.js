const { body, param, query } = require('express-validator');

const validatePatientId = [
  param('patientId')
    .isInt({ min: 1 })
    .withMessage('ID patient invalide')
];

const validateAllergy = [
  ...validatePatientId,
  body('allergen')
    .notEmpty()
    .withMessage('Allergène requis')
    .isLength({ max: 200 }),
  body('reaction')
    .optional()
    .isString()
    .isLength({ max: 500 }),
  body('severity')
    .optional()
    .isIn(['mild', 'moderate', 'severe', 'life_threatening'])
    .withMessage('Sévérité invalide'),
  body('diagnosed_date')
    .optional()
    .isISO8601()
    .withMessage('Date invalide')
];

const validateVitalSigns = [
  ...validatePatientId,
  body('height')
    .optional()
    .isFloat({ min: 30, max: 250 })
    .withMessage('Taille invalide (30-250 cm)'),
  body('weight')
    .optional()
    .isFloat({ min: 1, max: 300 })
    .withMessage('Poids invalide (1-300 kg)'),
  body('systolic_bp')
    .optional()
    .isInt({ min: 70, max: 250 })
    .withMessage('Tension systolique invalide'),
  body('diastolic_bp')
    .optional()
    .isInt({ min: 40, max: 150 })
    .withMessage('Tension diastolique invalide'),
  body('heart_rate')
    .optional()
    .isInt({ min: 30, max: 220 })
    .withMessage('Fréquence cardiaque invalide'),
  body('temperature')
    .optional()
    .isFloat({ min: 30, max: 45 })
    .withMessage('Température invalide')
];

const validateVaccination = [
  ...validatePatientId,
  body('vaccine_name')
    .notEmpty()
    .withMessage('Nom du vaccin requis'),
  body('administration_date')
    .isISO8601()
    .withMessage('Date d\'administration invalide'),
  body('next_due_date')
    .optional()
    .isISO8601()
    .withMessage('Date de rappel invalide')
    .custom((nextDate, { req }) => {
      if (new Date(nextDate) <= new Date(req.body.administration_date)) {
        throw new Error('La date de rappel doit être après la date d\'administration');
      }
      return true;
    })
];

const validateCondition = [
  ...validatePatientId,
  body('condition_name')
    .notEmpty()
    .withMessage('Nom de la condition requis'),
  body('icd10_code')
    .optional()
    .matches(/^[A-Z][0-9]{2}(\.[0-9])?$/)
    .withMessage('Code CIM-10 invalide'),
  body('diagnosed_date')
    .optional()
    .isISO8601()
    .withMessage('Date invalide'),
  body('is_chronic')
    .optional()
    .isBoolean()
];

const validateConsultationNote = [
  ...validatePatientId,
  body('subjective')
    .optional()
    .isString(),
  body('objective')
    .optional()
    .isString(),
  body('assessment')
    .optional()
    .isString(),
  body('plan')
    .optional()
    .isString()
];

module.exports = {
  validatePatientId,
  validateAllergy,
  validateVitalSigns,
  validateVaccination,
  validateCondition,
  validateConsultationNote
};