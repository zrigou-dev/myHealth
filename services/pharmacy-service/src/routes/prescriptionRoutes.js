const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const dispensationController = require('../controllers/dispensationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validatePrescription } = require('../validators/pharmacyValidators');

// Routes pour patients
router.get('/my-prescriptions', 
  authenticate, 
  authorize('patient'),
  prescriptionController.getMyPrescriptions
);

// Routes pour médecins
router.post('/', 
  authenticate, 
  authorize('doctor', 'admin'),
  validatePrescription,
  prescriptionController.createPrescription
);

router.get('/doctor/:doctorId', 
  authenticate, 
  authorize('doctor', 'admin'),
  prescriptionController.getDoctorPrescriptions
);

// Routes pour pharmaciens
router.get('/:id/availability', 
  authenticate, 
  authorize('pharmacist', 'admin'),
  prescriptionController.checkAvailability
);

// Routes accessibles selon permissions
router.get('/stats', 
  authenticate, 
  authorize('admin', 'doctor'),
  prescriptionController.getStats
);

router.get('/:id', 
  authenticate,
  prescriptionController.getPrescription
);

router.put('/:id/cancel', 
  authenticate,
  authorize('doctor', 'admin'),
  prescriptionController.cancelPrescription
);

router.put('/:id/extend', 
  authenticate,
  authorize('doctor', 'admin'),
  prescriptionController.extendPrescription
);

module.exports = router;