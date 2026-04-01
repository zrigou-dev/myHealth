const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Routes patients
router.post('/claims', 
  authenticate, 
  authorize('patient'),
  insuranceController.createClaim
);

router.get('/claims/my-claims', 
  authenticate, 
  authorize('patient'),
  insuranceController.getMyClaims
);

router.get('/claims/:id', 
  authenticate,
  insuranceController.getClaim
);

// Routes admin
router.get('/admin/pending', 
  authenticate, 
  authorize('admin'),
  insuranceController.getPendingClaims
);

router.put('/admin/claims/:id/status', 
  authenticate, 
  authorize('admin'),
  insuranceController.updateClaimStatus
);

router.get('/admin/stats', 
  authenticate, 
  authorize('admin'),
  insuranceController.getInsuranceStats
);

module.exports = router;