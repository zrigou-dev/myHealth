const express = require('express');
const router = express.Router();
const labRequestController = require('../controllers/labRequestController');
const labResultController = require('../controllers/labResultController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateLabRequest, validateResult } = require('../validators/laboratoryValidators');

// Routes pour patients
router.get('/my-requests', 
  authenticate, 
  authorize('patient'),
  labRequestController.getMyRequests
);

// Routes pour médecins
router.post('/', 
  authenticate, 
  authorize('doctor', 'admin'),
  validateLabRequest,
  labRequestController.createRequest
);

router.get('/doctor/:doctorId', 
  authenticate, 
  authorize('doctor', 'admin'),
  labRequestController.getDoctorRequests
);

// Routes pour techniciens de laboratoire
router.put('/:id/status', 
  authenticate, 
  authorize('lab_technician', 'admin'),
  labRequestController.updateStatus
);

router.put('/tests/:testId/status', 
  authenticate, 
  authorize('lab_technician', 'admin'),
  labRequestController.updateTestStatus
);

// Routes pour résultats
router.post('/results', 
  authenticate, 
  authorize('lab_technician', 'admin'),
  validateResult,
  labResultController.addResult
);

router.put('/results/:id/validate', 
  authenticate, 
  authorize('lab_technician', 'admin'),
  labResultController.validateResult
);

router.get('/:requestId/results', 
  authenticate,
  labResultController.getResults
);

// Routes accessibles selon permissions
router.get('/urgent', 
  authenticate, 
  authorize('lab_technician', 'doctor', 'admin'),
  labRequestController.getUrgentRequests
);

router.get('/stats', 
  authenticate, 
  authorize('admin', 'doctor'),
  labRequestController.getStats
);

router.get('/:id', 
  authenticate,
  labRequestController.getRequest
);

router.get('/:id/pdf', 
  authenticate,
  labResultController.generateReport
);

module.exports = router;