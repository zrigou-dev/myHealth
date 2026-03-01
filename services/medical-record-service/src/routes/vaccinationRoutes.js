const express = require('express');
const router = express.Router();
const vaccinationController = require('../controllers/vaccinationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateId, checkPatientAccess } = require('../middleware/validationMiddleware');
const { validateVaccination } = require('../validators/medicalRecordValidators');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les vaccinations d'un patient
router.get('/patient/:patientId',
  checkPatientAccess,
  validateId('patientId'),
  vaccinationController.getHistory
);

router.get('/patient/:patientId/upcoming',
  checkPatientAccess,
  validateId('patientId'),
  vaccinationController.getUpcoming
);

router.post('/patient/:patientId',
  authorize('doctor', 'nurse', 'admin'),
  checkPatientAccess,
  validateId('patientId'),
  validateVaccination,
  vaccinationController.createVaccination
);

router.get('/patient/:patientId/check-due',
  checkPatientAccess,
  validateId('patientId'),
  vaccinationController.checkDue
);

router.get('/patient/:patientId/summary',
  checkPatientAccess,
  validateId('patientId'),
  vaccinationController.getSummary
);

// Routes pour une vaccination spécifique
router.get('/:id',
  validateId('id'),
  vaccinationController.getVaccination
);

router.put('/:id',
  authorize('doctor', 'nurse', 'admin'),
  validateId('id'),
  vaccinationController.updateVaccination
);

router.delete('/:id',
  authorize('admin'),
  validateId('id'),
  vaccinationController.deleteVaccination
);

router.post('/:id/reminder',
  authorize('doctor', 'nurse', 'admin'),
  validateId('id'),
  vaccinationController.sendReminder
);

// Routes pour les statistiques
router.get('/stats/coverage',
  authorize('admin'),
  vaccinationController.getVaccinationCoverage
);

router.get('/stats/upcoming',
  authorize('admin'),
  vaccinationController.getUpcomingVaccinations
);

// Routes pour les calendriers vaccinaux
router.get('/schedule/:age',
  vaccinationController.getVaccinationSchedule
);

router.post('/schedule/recommendations/:patientId',
  authorize('doctor', 'admin'),
  validateId('patientId'),
  vaccinationController.getRecommendations
);

module.exports = router;