const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

// Health check (PUBLIC - pas d'auth)
router.get('/health', notificationController.health);

// Validation pour envoi d'email
const validateEmail = [
  body('to').isEmail().withMessage('Email invalide'),
  body('subject').notEmpty().withMessage('Sujet requis'),
  body('html').notEmpty().withMessage('Contenu requis'),
  body('user_id').isInt().withMessage('ID utilisateur requis')
];

// Routes protégées
router.post('/email',
  authenticate,
  authorize('admin'),
  validateEmail,
  notificationController.sendEmail
);

router.get('/my',
  authenticate,
  notificationController.getMyNotifications
);

router.patch('/:id/read',
  authenticate,
  notificationController.markAsRead
);

module.exports = router;