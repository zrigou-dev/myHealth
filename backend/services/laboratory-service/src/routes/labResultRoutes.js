const express = require('express');
const router = express.Router();
const labResultController = require('../controllers/labResultController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateResult } = require('../validators/laboratoryValidators');
const { validateId } = require('../middleware/validationMiddleware');

// Routes pour les techniciens de laboratoire
router.post('/',
  authenticate,
  authorize('lab_technician', 'admin'),
  validateResult,
  labResultController.addResult
);

router.post('/bulk',
  authenticate,
  authorize('lab_technician', 'admin'),
  labResultController.addBulkResults
);

router.put('/:id/validate',
  authenticate,
  authorize('lab_technician', 'admin'),
  validateId('id'),
  labResultController.validateResult
);

// Routes pour les patients
router.get('/my-results',
  authenticate,
  authorize('patient'),
  labResultController.getMyResults
);

router.get('/patient/:patientId/test/:testId/history',
  authenticate,
  authorize('patient', 'doctor', 'admin'),
  labResultController.getPatientTestHistory
);

router.get('/patient/:patientId',
  authenticate,
  authorize('patient', 'doctor', 'admin'),
  labResultController.getPatientResults
);

// Routes pour une demande spécifique
router.get('/request/:requestId',
  authenticate,
  validateId('requestId'),
  labResultController.getResults
);

router.get('/request/:requestId/pdf',
  authenticate,
  validateId('requestId'),
  labResultController.generateReport
);

// Routes pour un résultat spécifique
router.get('/:id',
  authenticate,
  validateId('id'),
  labResultController.getResult
);

router.put('/:id/print',
  authenticate,
  authorize('lab_technician', 'admin'),
  validateId('id'),
  labResultController.markAsPrinted
);

router.put('/:id/comment',
  authenticate,
  authorize('lab_technician', 'doctor', 'admin'),
  validateId('id'),
  labResultController.addComment
);

// Routes pour les statistiques
router.get('/stats/overview',
  authenticate,
  authorize('admin', 'doctor'),
  labResultController.getResultStats
);

module.exports = router;