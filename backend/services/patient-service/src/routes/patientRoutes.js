const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  validatePatientProfile,
  validateNote,
  validateEmergencyContact
} = require('../validators/patientValidators');

// Routes pour patients (accès patient)
router.post('/profile', 
  authenticate, 
  authorize('patient'),
  validatePatientProfile,
  patientController.createPatient
);

router.get('/profile', 
  authenticate, 
  authorize('patient'),
  patientController.getPatientProfile
);

router.put('/profile', 
  authenticate, 
  authorize('patient'),
  validatePatientProfile,
  patientController.updatePatient
);

router.post('/notes', 
  authenticate, 
  authorize('patient'),
  validateNote,
  patientController.addNote
);

router.get('/notes', 
  authenticate, 
  authorize('patient'),
  patientController.getNotes
);

router.post('/emergency-contact', 
  authenticate, 
  authorize('patient'),
  validateEmergencyContact,
  patientController.addEmergencyContact
);

// Routes pour admin/doctors
router.get('/search', 
  authenticate, 
  authorize('admin', 'doctor'),
  patientController.searchPatients
);

router.get('/stats', 
  authenticate, 
  authorize('admin'),
  patientController.getStats
);

router.get('/user/:userId', 
  authenticate, 
  authorize('admin', 'doctor', 'patient'),
  patientController.getPatientByUserId
);

router.get('/:id', 
  authenticate, 
  authorize('admin', 'doctor', 'patient'),
  patientController.getPatientById
);

module.exports = router;