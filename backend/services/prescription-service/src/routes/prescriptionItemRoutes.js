const express = require('express');
const router = express.Router();
const prescriptionItemController = require('../controllers/prescriptionItemController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateId } = require('../middleware/validationMiddleware');
const { body } = require('express-validator');

// Validation pour mise à jour d'item
const validateItemUpdate = [
  body('dosage_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Dosage invalide'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantité invalide'),
  body('instructions')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Instructions trop longues')
];

// Routes pour les items
router.put('/:id', 
  authenticate,
  authorize('doctor', 'admin'),
  validateId('id'),
  validateItemUpdate,
  prescriptionItemController.updateItem
);

router.delete('/:id', 
  authenticate,
  authorize('doctor', 'admin'),
  validateId('id'),
  prescriptionItemController.deleteItem
);

router.get('/prescription/:prescriptionId/summary', 
  authenticate,
  validateId('prescriptionId'),
  prescriptionItemController.getPrescriptionSummary
);

router.get('/:id/availability', 
  authenticate,
  authorize('pharmacist', 'admin'),
  validateId('id'),
  prescriptionItemController.checkItemAvailability
);

router.post('/:id/validate', 
  authenticate,
  authorize('pharmacist', 'admin'),
  validateId('id'),
  prescriptionItemController.validateItem
);

module.exports = router;