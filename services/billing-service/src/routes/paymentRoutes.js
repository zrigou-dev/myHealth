const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validatePayment } = require('../validators/billingValidators');

// Webhook Stripe (pas d'authentification)
router.post('/webhook/stripe', 
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook
);

// Routes protégées
router.get('/my-payments', 
  authenticate, 
  authorize('patient'),
  paymentController.getMyPayments
);

router.post('/stripe/:id', 
  authenticate,
  paymentController.createStripePayment
);

router.post('/:paymentId/refund', 
  authenticate,
  authorize('admin'),
  paymentController.refundPayment
);

module.exports = router;