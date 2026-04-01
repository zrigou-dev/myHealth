const { body, query, param } = require('express-validator');
const moment = require('moment');

const validateCreateAppointment = [
  body('doctor_id')
    .isInt({ min: 1 })
    .withMessage('ID médecin invalide'),

  body('appointment_date')
    .isISO8601()
    .withMessage('Format de date invalide')
    .custom(date => {
      if (moment(date).isBefore(moment().startOf('day'))) {
        throw new Error('La date ne peut pas être dans le passé');
      }
      return true;
    }),

  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Format d\'heure invalide (HH:MM)'),

  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 120 })
    .withMessage('La durée doit être entre 15 et 120 minutes'),

  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La raison est trop longue (max 500 caractères)'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Les notes sont trop longues (max 1000 caractères)')
];

const validateAppointmentId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID rendez-vous invalide')
];

const validateCancelAppointment = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID rendez-vous invalide'),
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('La raison d\'annulation est trop longue')
];

const validateRescheduleAppointment = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID rendez-vous invalide'),
  body('appointment_date')
    .isISO8601()
    .withMessage('Format de date invalide')
    .custom(date => {
      if (moment(date).isBefore(moment().startOf('day'))) {
        throw new Error('La date ne peut pas être dans le passé');
      }
      return true;
    }),
  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Format d\'heure invalide (HH:MM)'),
  body('duration_minutes')
    .optional()
    .isInt({ min: 15, max: 120 })
    .withMessage('La durée doit être entre 15 et 120 minutes')
];

const validateGetAvailability = [
  param('doctorId')
    .isInt({ min: 1 })
    .withMessage('ID médecin invalide'),
  query('date')
    .isISO8601()
    .withMessage('Format de date invalide')
];

const validateGetAppointments = [
  query('status')
    .optional()
    .isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .withMessage('Statut invalide'),
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Format de date invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit doit être entre 1 et 100')
];

module.exports = {
  validateCreateAppointment,
  validateAppointmentId,
  validateCancelAppointment,
  validateRescheduleAppointment,
  validateGetAvailability,
  validateGetAppointments
};