const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  validateCreateAppointment,
  validateAppointmentId,
  validateCancelAppointment,
  validateRescheduleAppointment,
  validateGetAvailability,
  validateGetAppointments
} = require('../validators/appointmentValidators');

// Routes publiques (sans authentification)
router.get('/doctors/:doctorId/availability',
  validateGetAvailability,
  appointmentController.getDoctorAvailability
);

// Routes protégées (authentification requise)

// Patients
router.post('/',
  authenticate,
  authorize('patient', 'admin'),
  validateCreateAppointment,
  appointmentController.createAppointment
);

router.get('/my-appointments',
  authenticate,
  validateGetAppointments,
  appointmentController.getMyAppointments
);

router.get('/patient/:patientId',
  authenticate,
  authorize('patient', 'doctor', 'admin'),
  appointmentController.getPatientAppointments
);

// Médecins
router.get('/doctors/:doctorId',
  authenticate,
  authorize('doctor', 'admin'),
  appointmentController.getDoctorAppointments
);

router.put('/:id/confirm',
  authenticate,
  authorize('doctor', 'admin'),
  validateAppointmentId,
  appointmentController.confirmAppointment
);

router.put('/:id/reject',
  authenticate,
  authorize('doctor', 'admin'),
  validateAppointmentId,
  appointmentController.rejectAppointment
);

router.put('/:id/complete',
  authenticate,
  authorize('doctor', 'admin'),
  validateAppointmentId,
  appointmentController.completeAppointment
);

// Commun (patient ou médecin)
router.put('/:id/cancel',
  authenticate,
  validateCancelAppointment,
  appointmentController.cancelAppointment
);

router.post('/:id/reschedule',
  authenticate,
  validateRescheduleAppointment,
  appointmentController.rescheduleAppointment
);

// Statistiques
router.get('/stats',
  authenticate,
  authorize('admin', 'doctor'),
  appointmentController.getStats
);

// Admin seulement
router.get('/admin/all',
  authenticate,
  authorize('admin'),
  appointmentController.getStats
);

module.exports = router;