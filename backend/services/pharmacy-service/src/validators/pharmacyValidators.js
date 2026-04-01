const { body } = require('express-validator');

const validatePrescription = [
  body('patient_id')
    .isInt({ min: 1 })
    .withMessage('ID patient invalide'),
  
  body('doctor_id')
    .isInt({ min: 1 })
    .withMessage('ID médecin invalide'),
  
  body('expiry_date')
    .isISO8601()
    .withMessage('Date d\'expiration invalide')
    .custom(date => {
      if (new Date(date) <= new Date()) {
        throw new Error('La date d\'expiration doit être dans le futur');
      }
      return true;
    }),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Au moins un médicament est requis'),
  
  body('items.*.medication_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID médicament invalide'),
  
  body('items.*.medication_name')
    .optional()
    .isString()
    .withMessage('Nom médicament invalide'),
  
  body('items.*.dosage')
    .notEmpty()
    .withMessage('Dosage requis'),
  
  body('items.*.frequency')
    .notEmpty()
    .withMessage('Fréquence requise'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantité invalide')
];

const validateMedication = [
  body('code')
    .notEmpty()
    .withMessage('Code requis')
    .isLength({ max: 50 }),
  
  body('name')
    .notEmpty()
    .withMessage('Nom requis')
    .isLength({ max: 200 }),
  
  body('form')
    .isIn(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'other'])
    .withMessage('Forme invalide'),
  
  body('requires_prescription')
    .optional()
    .isBoolean()
    .withMessage('Doit être un booléen')
];

const validateDispensation = [
  body('prescription_id')
    .isInt({ min: 1 })
    .withMessage('ID prescription invalide'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Au moins un item requis'),
  
  body('items.*.prescription_item_id')
    .isInt({ min: 1 })
    .withMessage('ID item prescription invalide'),
  
  body('items.*.medication_id')
    .isInt({ min: 1 })
    .withMessage('ID médicament invalide'),
  
  body('items.*.batch_id')
    .isInt({ min: 1 })
    .withMessage('ID lot invalide'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantité invalide')
];

const validateBatch = [
  body('medication_id')
    .isInt({ min: 1 })
    .withMessage('ID médicament invalide'),
  
  body('batch_number')
    .notEmpty()
    .withMessage('Numéro de lot requis'),
  
  body('expiry_date')
    .isISO8601()
    .withMessage('Date d\'expiration invalide')
    .custom(date => {
      if (new Date(date) <= new Date()) {
        throw new Error('La date d\'expiration doit être dans le futur');
      }
      return true;
    }),
  
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantité invalide')
];

module.exports = {
  validatePrescription,
  validateMedication,
  validateDispensation,
  validateBatch
};