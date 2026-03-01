const { body, param, query } = require('express-validator');

// Validateur existant pour demande
const validateLabRequest = [
  body('patient_id')
    .isInt({ min: 1 })
    .withMessage('ID patient invalide'),
  
  body('doctor_id')
    .isInt({ min: 1 })
    .withMessage('ID médecin invalide'),
  
  body('tests')
    .isArray({ min: 1 })
    .withMessage('Au moins un test est requis'),
  
  body('tests.*.test_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID test invalide'),
  
  body('priority')
    .optional()
    .isIn(['routine', 'urgent', 'stat'])
    .withMessage('Priorité invalide')
];

// ✅ NOUVEAU: Validateur pour résultat
const validateResult = [
  body('request_id')
    .isInt({ min: 1 })
    .withMessage('ID requête invalide'),
  
  body('request_test_id')
    .isInt({ min: 1 })
    .withMessage('ID test requête invalide'),
  
  body('test_id')
    .isInt({ min: 1 })
    .withMessage('ID test invalide'),
  
  body('result_value')
    .optional()
    .isFloat()
    .withMessage('Valeur résultat invalide'),
  
  body('result_text')
    .optional()
    .isString()
    .withMessage('Texte résultat invalide'),
  
  body('unit')
    .optional()
    .isString()
    .withMessage('Unité invalide')
];

// ✅ NOUVEAU: Validateur pour résultats groupés
const validateBulkResults = [
  body('request_id')
    .isInt({ min: 1 })
    .withMessage('ID requête invalide'),
  
  body('results')
    .isArray({ min: 1 })
    .withMessage('Au moins un résultat requis'),
  
  body('results.*.request_test_id')
    .isInt({ min: 1 })
    .withMessage('ID test requête invalide'),
  
  body('results.*.test_id')
    .isInt({ min: 1 })
    .withMessage('ID test invalide')
];

// ✅ NOUVEAU: Validateur pour historique patient
const validatePatientHistory = [
  param('patientId')
    .isInt({ min: 1 })
    .withMessage('ID patient invalide'),
  
  param('testId')
    .isInt({ min: 1 })
    .withMessage('ID test invalide'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit doit être entre 1 et 100')
];

module.exports = {
  validateLabRequest,
  validateResult,
  validateBulkResults,
  validatePatientHistory
};