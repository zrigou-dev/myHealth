const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medicationController');
const stockController = require('../controllers/stockController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateMedication } = require('../validators/pharmacyValidators');

// Routes publiques (authentification requise)
router.get('/', 
  authenticate, 
  medicationController.getAllMedications
);

router.get('/forms', 
  authenticate, 
  medicationController.getForms
);

router.get('/search', 
  authenticate, 
  medicationController.searchMedications
);

router.get('/:id', 
  authenticate, 
  medicationController.getMedication
);

// Routes pour le stock
router.get('/:medicationId/stock', 
  authenticate, 
  stockController.getStock
);

// Routes admin seulement
router.post('/', 
  authenticate, 
  authorize('admin'),
  validateMedication,
  medicationController.createMedication
);

router.put('/:id', 
  authenticate, 
  authorize('admin'),
  medicationController.updateMedication
);

module.exports = router;