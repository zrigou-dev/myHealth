const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  validateDoctorProfile,
  validateSchedule,
  validateLeave,
  validateReview
} = require('../validators/doctorValidators');

// Routes publiques (pas besoin d'authentification)
router.get('/search', doctorController.searchDoctors);
router.get('/public/:id', doctorController.getPublicProfile);
router.get('/:doctorId/availability', doctorController.getAvailability);

// Routes pour médecins (authentification requise)
router.post('/profile', 
  authenticate, 
  authorize('doctor'),
  validateDoctorProfile,
  doctorController.createDoctorProfile
);

router.get('/profile', 
  authenticate, 
  authorize('doctor'),
  doctorController.getMyProfile
);

router.put('/profile', 
  authenticate, 
  authorize('doctor'),
  validateDoctorProfile,
  doctorController.updateProfile
);

// Gestion des horaires
router.post('/schedules', 
  authenticate, 
  authorize('doctor'),
  validateSchedule,
  doctorController.addSchedule
);

router.get('/schedules', 
  authenticate, 
  authorize('doctor'),
  doctorController.getMySchedules
);

// Gestion des congés
router.post('/leave', 
  authenticate, 
  authorize('doctor'),
  validateLeave,
  doctorController.addLeave
);

// Gestion des patients
router.post('/patients/assign', 
  authenticate, 
  authorize('doctor', 'admin', 'patient'),
  doctorController.assignPatient
);

router.get('/patients', 
  authenticate, 
  authorize('doctor'),
  doctorController.getMyPatients
);

// Routes pour patients (évaluations)
router.post('/:doctorId/reviews', 
  authenticate, 
  authorize('patient'),
  validateReview,
  doctorController.addReview
);

// Routes admin
router.get('/admin/stats', 
  authenticate, 
  authorize('admin'),
  doctorController.getAllDoctorsStats
);

module.exports = router;