const Dispensation = require('../models/Dispensation');
const Prescription = require('../models/Prescription');
const Stock = require('../models/Stock');
const { validationResult } = require('express-validator');
const db = require('../config/database');
class DispensationController {
  // Créer une délivrance
  async createDispensation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { prescription_id, items, notes } = req.body;

      // Vérifier la prescription
      const prescription = await Prescription.findById(prescription_id);
      if (!prescription) {
        return res.status(404).json({ error: 'Prescription non trouvée' });
      }

      if (prescription.status === 'expired') {
        return res.status(400).json({ error: 'Prescription expirée' });
      }

      if (prescription.status === 'dispensed') {
        return res.status(400).json({ error: 'Prescription déjà entièrement délivrée' });
      }

      // Créer la délivrance
      const dispensation = await Dispensation.create({
        prescription_id,
        patient_id: prescription.patient_id,
        pharmacist_id: req.user.id,
        notes
      });

      // Ajouter les items
      const dispensationItems = await Dispensation.addItems(dispensation.id, items);

      res.status(201).json({
        message: 'Délivrance effectuée avec succès',
        dispensation: {
          ...dispensation,
          items: dispensationItems
        }
      });
    } catch (error) {
      console.error('❌ Erreur création délivrance:', error);
      res.status(500).json({ 
        error: 'Erreur interne',
        message: error.message 
      });
    }
  }

  // Récupérer une délivrance
  async getDispensation(req, res) {
    try {
      const { id } = req.params;
      const dispensation = await Dispensation.findById(id);

      if (!dispensation) {
        return res.status(404).json({ error: 'Délivrance non trouvée' });
      }

      const items = await Dispensation.getItems(id);

      res.json({
        ...dispensation,
        items
      });
    } catch (error) {
      console.error('❌ Erreur récupération délivrance:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer mes délivrances (patient)
  async getMyDispensations(req, res) {
    try {
      const dispensations = await Dispensation.getByPatient(req.user.id);

      res.json({
        count: dispensations.length,
        dispensations
      });
    } catch (error) {
      console.error('❌ Erreur récupération délivrances:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer les délivrances d'un patient (pour agrégation)
  async getPatientDispensations(req, res) {
    try {
      const { patientId } = req.params;
      const dispensations = await Dispensation.getByPatient(patientId);

      res.json(dispensations);
    } catch (error) {
      console.error('❌ Erreur récupération délivrances patient:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer les délivrances d'une prescription
  async getPrescriptionDispensations(req, res) {
    try {
      const { prescriptionId } = req.params;
      const dispensations = await Dispensation.getByPrescription(prescriptionId);

      res.json({
        prescription_id: prescriptionId,
        count: dispensations.length,
        dispensations
      });
    } catch (error) {
      console.error('❌ Erreur récupération délivrances prescription:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Statistiques
  async getStats(req, res) {
    try {
      const { period } = req.query;
      const stats = await Dispensation.getStats(period || 'month');

      res.json(stats);
    } catch (error) {
      console.error('❌ Erreur récupération stats délivrances:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Annuler une délivrance
  async cancelDispensation(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Récupérer la délivrance
      const dispensation = await Dispensation.findById(id);
      if (!dispensation) {
        return res.status(404).json({ error: 'Délivrance non trouvée' });
      }

      // Récupérer les items pour remettre en stock
      const items = await Dispensation.getItems(id);

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        // Remettre en stock
        for (const item of items) {
          await client.query(`
            UPDATE medication_batches 
            SET quantity = quantity + $2
            WHERE id = $1
          `, [item.batch_id, item.quantity]);
        }

        // Mettre à jour le statut de la délivrance
        await client.query(`
          UPDATE dispensations 
          SET status = 'cancelled', notes = CONCAT(notes, ' - Annulé: ', $2)
          WHERE id = $1
        `, [id, reason]);

        // Recalculer le statut de la prescription
        await client.query(`
          WITH dispensed_totals AS (
            SELECT 
              di.prescription_item_id,
              SUM(di.quantity) as total_dispensed
            FROM dispensation_items di
            JOIN dispensations d ON di.dispensation_id = d.id
            WHERE d.prescription_id = $1 AND d.status = 'completed'
            GROUP BY di.prescription_item_id
          )
          UPDATE prescription_items pi
          SET quantity_dispensed = COALESCE((
            SELECT total_dispensed 
            FROM dispensed_totals 
            WHERE prescription_item_id = pi.id
          ), 0)
          WHERE pi.prescription_id = $1
        `, [dispensation.prescription_id]);

        await client.query('COMMIT');

        res.json({ message: 'Délivrance annulée' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Erreur annulation délivrance:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new DispensationController();