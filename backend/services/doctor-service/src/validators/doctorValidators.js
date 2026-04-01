const { body } = require('express-validator');

const validateDoctorProfile = [
  body('license_number')
    .notEmpty()
    .withMessage('License number is required')
    .isLength({ min: 5, max: 50 })
    .withMessage('License number must be between 5 and 50 characters'),
  
  body('specialization')
    .notEmpty()
    .withMessage('Specialization is required')
    .isLength({ min: 3, max: 100 }),
  
  body('sub_specializations')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Sub-specializations must be an array'),
  
  body('years_experience')
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 70 })
    .withMessage('Years experience must be between 0 and 70'),
  
  body('consultation_fee')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a positive number'),
  
  body('languages_spoken')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Languages must be an array'),
  
  body('office_phone')
    .optional({ checkFalsy: true })
    .matches(/^[+]?[\d\s-]+$/)
    .withMessage('Invalid phone number format'),
  
  body('office_email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email format')
];

const validateSchedule = [
  body('day_of_week')
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be between 0 (Monday) and 6 (Sunday)'),
  
  body('start_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  
  body('end_time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)')
    .custom((end_time, { req }) => {
      if (end_time <= req.body.start_time) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('consultation_duration')
    .optional()
    .isInt({ min: 15, max: 120 })
    .withMessage('Consultation duration must be between 15 and 120 minutes')
];

const validateLeave = [
  body('start_date')
    .isISO8601()
    .withMessage('Invalid start date'),
  
  body('end_date')
    .isISO8601()
    .withMessage('Invalid end date')
    .custom((end_date, { req }) => {
      if (new Date(end_date) < new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Reason too long')
];

const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comment too long'),
  
  body('consultation_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid consultation date')
];

module.exports = {
  validateDoctorProfile,
  validateSchedule,
  validateLeave,
  validateReview
};