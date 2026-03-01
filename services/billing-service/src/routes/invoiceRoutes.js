const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateInvoice, validatePayment } = require('../validators/billingValidators');

// Routes pour patients
router.get('/my-invoices', 
  authenticate, 
  authorize('patient'),
  invoiceController.getMyInvoices
);

// Routes pour médecins
router.get('/doctor/:doctorId', 
  authenticate, 
  authorize('doctor', 'admin'),
  invoiceController.getByDoctor
);

// Routes pour tous (avec vérification des permissions)
router.get('/:id', 
  authenticate, 
  invoiceController.getInvoice
);

router.get('/:id/pdf', 
  authenticate, 
  invoiceController.downloadPdf
);

// Routes pour les paiements
router.post('/:id/payments', 
  authenticate,
  validatePayment,
  paymentController.addPayment
);

router.get('/:id/payments', 
  authenticate,
  paymentController.getPayments
);

// Routes admin/médecin
router.post('/from-appointment/:appointmentId', 
  authenticate,
  authorize('admin', 'doctor'),
  invoiceController.createFromAppointment
);

router.put('/:id/send', 
  authenticate,
  authorize('admin', 'doctor'),
  invoiceController.markAsSent
);

router.get('/stats/overview', 
  authenticate,
  authorize('admin'),
  invoiceController.getStats
);

router.get('/admin/overdue', 
  authenticate,
  authorize('admin'),
  invoiceController.getOverdueInvoices
);

// Création manuelle (admin only)
router.post('/', 
  authenticate,
  authorize('admin'),
  validateInvoice,
  invoiceController.createInvoice
);

module.exports = router;