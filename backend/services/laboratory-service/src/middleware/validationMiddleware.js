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

module.exports = {
  validate,
  validateId,
  validateDate,
  validatePagination
};