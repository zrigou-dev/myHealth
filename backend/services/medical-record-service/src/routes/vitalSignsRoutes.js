const express = require('express');
const router = express.Router();
const vitalSignsController = require('../controllers/vitalSignsController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateId, checkPatientAccess } = require('../middleware/validationMiddleware');
const { validateVitalSigns } = require('../validators/medicalRecordValidators');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les constantes d'un patient
router.get('/patient/:patientId',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getHistory
);

router.get('/patient/:patientId/latest',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getLatest
);

router.post('/patient/:patientId',
  authorize('doctor', 'nurse', 'admin'),
  checkPatientAccess,
  validateId('patientId'),
  validateVitalSigns,
  vitalSignsController.createVitalSigns
);

router.get('/patient/:patientId/stats',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getStats
);

router.get('/patient/:patientId/chart/:type',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getChartData
);

router.get('/patient/:patientId/trends',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getTrends
);

router.get('/patient/:patientId/alerts',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getAlerts
);

// Routes pour une constante spécifique
router.get('/:id',
  validateId('id'),
  vitalSignsController.getVitalSign
);

router.put('/:id',
  authorize('doctor', 'nurse', 'admin'),
  validateId('id'),
  vitalSignsController.updateVitalSign
);

router.delete('/:id',
  authorize('admin'),
  validateId('id'),
  vitalSignsController.deleteVitalSign
);

// Routes pour les analyses
router.post('/analyze',
  authorize('doctor', 'admin'),
  vitalSignsController.analyzeVitals
);

router.get('/compare/:patientId1/:patientId2',
  authorize('doctor', 'admin'),
  validateId('patientId1'),
  validateId('patientId2'),
  vitalSignsController.comparePatients
);

// Routes pour les exportations
router.get('/export/:patientId/pdf',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.exportToPDF
);

router.get('/export/:patientId/csv',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.exportToCSV
);

module.exports = router;