const Medication = require('../models/Medication');
const Stock = require('../models/Stock');
const { validationResult } = require('express-validator');
const db = require('../config/database');

class MedicationController {
  // Créer un médicament
  async createMedication(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const medication = await Medication.create(req.body);

      res.status(201).json({
        message: 'Médicament créé avec succès',
        medication
      });
    } catch (error) {
      console.error('❌ Erreur création médicament:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Lister tous les médicaments
  async getAllMedications(req, res) {
    try {
      const { search, form, requires_prescription } = req.query;
      const medications = await Medication.getAll({
        search,
        form,
        requires_prescription: requires_prescription === 'true' ? true : 
                              requires_prescription === 'false' ? false : undefined
      });

      res.json({
        count: medications.length,
        medications
      });
    } catch (error) {
      console.error('❌ Erreur récupération médicaments:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer un médicament
  async getMedication(req, res) {
    try {
      const { id } = req.params;
      const medication = await Medication.findById(id);

      if (!medication) {
        return res.status(404).json({ error: 'Médicament non trouvé' });
      }

      // Récupérer le stock
      const stock = await Stock.getStock(id);

      res.json({
        ...medication,
        stock
      });
    } catch (error) {
      console.error('❌ Erreur récupération médicament:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Mettre à jour un médicament
  async updateMedication(req, res) {
    try {
      const { id } = req.params;
      const medication = await Medication.update(id, req.body);

      if (!medication) {
        return res.status(404).json({ error: 'Médicament non trouvé' });
      }

      res.json({
        message: 'Médicament mis à jour',
        medication
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour médicament:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Obtenir les formes disponibles
  async getForms(req, res) {
    try {
      const forms = await Medication.getForms();
      res.json(forms);
    } catch (error) {
      console.error('❌ Erreur récupération formes:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Rechercher des médicaments
  async searchMedications(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Requête trop courte' });
      }

      const result = await db.query(`
        SELECT * FROM medications 
        WHERE is_active = true 
          AND (name ILIKE $1 OR generic_name ILIKE $1 OR code ILIKE $1)
        ORDER BY name
        LIMIT 20
      `, [`%${q}%`]);

      res.json({
        query: q,
        count: result.rows.length,
        results: result.rows
      });
    } catch (error) {
      console.error('❌ Erreur recherche médicaments:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new MedicationController();