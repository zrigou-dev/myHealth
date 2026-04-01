const express = require('express');
const router = express.Router();
const dispensationController = require('../controllers/dispensationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateDispensation } = require('../validators/pharmacyValidators');

// Routes pour patients
router.get('/my-dispensations', 
  authenticate, 
  authorize('patient'),
  dispensationController.getMyDispensations
);

router.get('/patient/:patientId', 
  authenticate, 
  authorize('patient', 'doctor', 'pharmacist', 'admin'),
  dispensationController.getPatientDispensations
);

// Routes pour pharmaciens
router.post('/', 
  authenticate, 
  authorize('pharmacist', 'admin'),
  validateDispensation,
  dispensationController.createDispensation
);

router.get('/prescription/:prescriptionId', 
  authenticate, 
  authorize('pharmacist', 'doctor', 'admin'),
  dispensationController.getPrescriptionDispensations
);

router.put('/:id/cancel', 
  authenticate, 
  authorize('pharmacist', 'admin'),
  dispensationController.cancelDispensation
);

// Routes accessibles
router.get('/stats', 
  authenticate, 
  authorize('admin'),
  dispensationController.getStats
);

router.get('/:id', 
  authenticate,
  dispensationController.getDispensation
);

module.exports = router;