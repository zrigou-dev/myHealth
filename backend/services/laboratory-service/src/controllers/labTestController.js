const LabTest = require('../models/LabTest');
const { validationResult } = require('express-validator');
const db = require('../config/database');

class LabTestController {
  // Créer une nouvelle analyse
  async createTest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const test = await LabTest.create(req.body);

      res.status(201).json({
        message: 'Analyse créée avec succès',
        test
      });
    } catch (error) {
      console.error('❌ Erreur création analyse:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer toutes les analyses
  async getAllTests(req, res) {
    try {
      const { active_only } = req.query;
      const tests = await LabTest.getAll(active_only !== 'false');

      res.json({
        count: tests.length,
        tests
      });
    } catch (error) {
      console.error('❌ Erreur récupération analyses:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer une analyse
  async getTest(req, res) {
    try {
      const { id } = req.params;
      const test = await LabTest.findById(id);

      if (!test) {
        return res.status(404).json({ error: 'Analyse non trouvée' });
      }

      res.json(test);
    } catch (error) {
      console.error('❌ Erreur récupération analyse:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer par catégorie
  async getByCategory(req, res) {
    try {
      const { category } = req.params;
      const tests = await LabTest.getByCategory(category);

      res.json({
        category,
        count: tests.length,
        tests
      });
    } catch (error) {
      console.error('❌ Erreur récupération par catégorie:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Mettre à jour une analyse
  async updateTest(req, res) {
    try {
      const { id } = req.params;
      const test = await LabTest.update(id, req.body);

      if (!test) {
        return res.status(404).json({ error: 'Analyse non trouvée' });
      }

      res.json({
        message: 'Analyse mise à jour',
        test
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour analyse:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Obtenir les catégories
  async getCategories(req, res) {
    try {
      const categories = await LabTest.getCategories();

      res.json({
        count: categories.length,
        categories
      });
    } catch (error) {
      console.error('❌ Erreur récupération catégories:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Rechercher des analyses
  async searchTests(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Requête trop courte' });
      }

      const result = await db.query(`
        SELECT * FROM lab_tests 
        WHERE is_active = true 
          AND (test_name ILIKE $1 OR test_code ILIKE $1 OR category ILIKE $1)
        ORDER BY test_name
        LIMIT 20
      `, [`%${q}%`]);

      res.json({
        query: q,
        count: result.rows.length,
        results: result.rows
      });
    } catch (error) {
      console.error('❌ Erreur recherche analyses:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new LabTestController();