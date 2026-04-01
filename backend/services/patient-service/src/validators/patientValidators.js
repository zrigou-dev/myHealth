const { body } = require('express-validator');

const validatePatientProfile = [
  body('date_of_birth')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('gender')
    .optional({ checkFalsy: true })
    .toLowerCase()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('blood_type')
    .optional({ checkFalsy: true })
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood type'),
  
  body('height')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 300 })
    .withMessage('Height must be between 0 and 300 cm'),
  
  body('weight')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 500 })
    .withMessage('Weight must be between 0 and 500 kg'),
  
  body('emergency_contact_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Emergency contact name must be between 2 and 200 characters'),
  
  body('emergency_contact_phone')
    .optional({ checkFalsy: true })
    .matches(/^[+]?[\d\s-]+$/)
    .withMessage('Invalid phone number format'),
  
  body('insurance_policy_number')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }),
  
  body('allergies')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Allergies must be an array'),

  body('vaccinations')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Vaccinations must be an array'),

  body('current_medications')
    .optional({ checkFalsy: true })
    .isArray()
    .withMessage('Medications must be an array'),
  
  body('insurance_expiry_date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format')
];

const validateNote = [
  body('note_type')
    .notEmpty()
    .withMessage('Note type is required')
    .isIn(['general', 'medical', 'administrative'])
    .withMessage('Invalid note type'),
  
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title too long'),
  
  body('content')
    .notEmpty()
    .withMessage('Content is required')
];

const validateEmergencyContact = [
  body('full_name')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Name must be between 2 and 200 characters'),
  
  body('relationship')
    .notEmpty()
    .withMessage('Relationship is required'),
  
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s-]+$/)
    .withMessage('Invalid phone number format'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
];

module.exports = {
  validatePatientProfile,
  validateNote,
  validateEmergencyContact
};