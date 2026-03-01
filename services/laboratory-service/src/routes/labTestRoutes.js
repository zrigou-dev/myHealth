const express = require('express');
const router = express.Router();
const labTestController = require('../controllers/labTestController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Routes publiques (avec authentification simple)
router.get('/', 
  authenticate, 
  labTestController.getAllTests
);

router.get('/categories', 
  authenticate, 
  labTestController.getCategories
);

router.get('/search', 
  authenticate, 
  labTestController.searchTests
);

router.get('/category/:category', 
  authenticate, 
  labTestController.getByCategory
);

router.get('/:id', 
  authenticate, 
  labTestController.getTest
);

// Routes admin seulement
router.post('/', 
  authenticate, 
  authorize('admin'),
  labTestController.createTest
);

router.put('/:id', 
  authenticate, 
  authorize('admin'),
  labTestController.updateTest
);

module.exports = router;