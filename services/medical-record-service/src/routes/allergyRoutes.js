const express = require('express');
const router = express.Router();
const allergyController = require('../controllers/allergyController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateId, checkPatientAccess } = require('../middleware/validationMiddleware');
const { validateAllergy } = require('../validators/medicalRecordValidators');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les allergies d'un patient
router.get('/patient/:patientId',
  checkPatientAccess,
  validateId('patientId'),
  allergyController.getPatientAllergies
);

router.post('/patient/:patientId',
  authorize('doctor', 'admin'),
  checkPatientAccess,
  validateId('patientId'),
  validateAllergy,
  allergyController.createAllergy
);

// Routes pour une allergie spécifique
router.get('/:id',
  validateId('id'),
  allergyController.getAllergy
);

router.put('/:id',
  authorize('doctor', 'admin'),
  validateId('id'),
  allergyController.updateAllergy
);

router.delete('/:id',
  authorize('doctor', 'admin'),
  validateId('id'),
  allergyController.deleteAllergy
);

router.patch('/:id/deactivate',
  authorize('doctor', 'admin'),
  validateId('id'),
  allergyController.deactivateAllergy
);

router.patch('/:id/reactivate',
  authorize('doctor', 'admin'),
  validateId('id'),
  allergyController.reactivateAllergy
);

// Routes pour les statistiques
router.get('/stats/common',
  authorize('admin'),
  allergyController.getCommonAllergies
);

router.get('/patient/:patientId/stats',
  checkPatientAccess,
  validateId('patientId'),
  allergyController.getAllergyStats
);

module.exports = router;