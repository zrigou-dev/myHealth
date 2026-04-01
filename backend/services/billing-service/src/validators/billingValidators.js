const { body } = require('express-validator');

const validateInvoice = [
  body('patient_id')
    .isInt({ min: 1 })
    .withMessage('ID patient invalide'),
  
  body('doctor_id')
    .isInt({ min: 1 })
    .withMessage('ID médecin invalide'),
  
  body('subtotal')
    .isFloat({ min: 0 })
    .withMessage('Sous-total invalide'),
  
  body('total_amount')
    .isFloat({ min: 0 })
    .withMessage('Montant total invalide')
];

const validatePayment = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Montant invalide'),
  
  body('payment_method')
    .isIn(['card', 'cash', 'bank_transfer', 'insurance', 'cheque'])
    .withMessage('Méthode de paiement invalide')
];

module.exports = {
  validateInvoice,
  validatePayment
};