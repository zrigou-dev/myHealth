const { validationResult } = require('express-validator');

// Middleware de validation générique
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ 
      error: 'Erreur de validation',
      errors: errors.array() 
    });
  };
};

// Middleware pour vérifier les IDs
const validateId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({ 
        error: 'ID invalide',
        message: `Le paramètre ${paramName} doit être un nombre positif`
      });
    }
    
    next();
  };
};

// Middleware pour vérifier les dates
const validateDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Middleware pour pagination
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (page < 1) {
    return res.status(400).json({ error: 'Le numéro de page doit être >= 1' });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'La limite doit être entre 1 et 100' });
  }

  req.pagination = { page, limit, offset: (page - 1) * limit };
  next();
};

// Middleware pour valider le format JSON
const validateJsonContent = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!req.is('application/json')) {
      return res.status(400).json({ 
        error: 'Content-Type doit être application/json' 
      });
    }
  }
  next();
};

// Middleware pour échapper les caractères spéciaux (prévention XSS)
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Échapper les caractères HTML
        req.body[key] = req.body[key]
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
    });
  }
  next();
};

// Middleware pour valider les dates de prescription
const validatePrescriptionDates = (req, res, next) => {
  const { prescription_date, expiry_date, start_date } = req.body;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (prescription_date) {
    const pDate = new Date(prescription_date);
    if (pDate < today) {
      return res.status(400).json({ 
        error: 'La date de prescription ne peut pas être dans le passé' 
      });
    }
  }

  if (expiry_date) {
    const eDate = new Date(expiry_date);
    if (eDate <= today) {
      return res.status(400).json({ 
        error: 'La date d\'expiration doit être dans le futur' 
      });
    }
  }

  if (start_date && expiry_date) {
    const sDate = new Date(start_date);
    const eDate = new Date(expiry_date);
    if (sDate > eDate) {
      return res.status(400).json({ 
        error: 'La date de début ne peut pas être après la date d\'expiration' 
      });
    }
  }

  next();
};

module.exports = {
  validate,
  validateId,
  validateDate,
  validatePagination,
  validateJsonContent,
  sanitizeInput,
  validatePrescriptionDates
};