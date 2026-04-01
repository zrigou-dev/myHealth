const Prescription = require('../models/Prescription');
const Medication = require('../models/Medication');
const Stock = require('../models/Stock');
const { validationResult } = require('express-validator');
const DrugInteractions = require('../utils/drugInteractions');
const db = require('../config/database');
class PrescriptionController {
  // Créer une prescription
  async createPrescription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patient_id, doctor_id, appointment_id, items, ...prescriptionData } = req.body;

      // Valider les médicaments
      for (const item of items) {
        if (item.medication_id) {
          const medication = await Medication.findById(item.medication_id);
          if (!medication) {
            return res.status(404).json({ 
              error: `Médicament avec ID ${item.medication_id} non trouvé` 
            });
          }
          item.medication_name = medication.name;
        }
      }

      // Vérifier les interactions médicamenteuses
      const interactions = await DrugInteractions.checkInteractions(
        items.map(i => i.medication_id).filter(id => id)
      );

      if (interactions.severe.length > 0) {
        return res.status(400).json({
          error: 'Interactions médicamenteuses sévères détectées',
          interactions: interactions.severe
        });
      }

      // Créer la prescription
      const prescription = await Prescription.create({
        patient_id,
        doctor_id,
        appointment_id,
        ...prescriptionData,
        created_by: req.user.id
      });

      // Ajouter les lignes
      const prescriptionItems = await Prescription.addItems(prescription.id, items);

      res.status(201).json({
        message: 'Prescription créée avec succès',
        prescription: {
          ...prescription,
          items: prescriptionItems
        },
        interactions: interactions.warnings
      });
    } catch (error) {
      console.error('❌ Erreur création prescription:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer une prescription
  async getPrescription(req, res) {
    try {
      const { id } = req.params;
      const prescription = await Prescription.findById(id);

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription non trouvée' });
      }

      // Vérifier les permissions
      if (prescription.patient_id !== req.user.id && 
          prescription.doctor_id !== req.user.id && 
          req.user.role !== 'admin' &&
          req.user.role !== 'pharmacist') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const items = await Prescription.getItems(id);
      const dispensations = await require('../models/Dispensation').getByPrescription(id);

      res.json({
        ...prescription,
        items,
        dispensations
      });
    } catch (error) {
      console.error('❌ Erreur récupération prescription:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer mes prescriptions (patient)
  async getMyPrescriptions(req, res) {
    try {
      const { status } = req.query;
      const prescriptions = await Prescription.getByPatient(req.user.id, status);

      res.json({
        count: prescriptions.length,
        prescriptions
      });
    } catch (error) {
      console.error('❌ Erreur récupération prescriptions:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer les prescriptions d'un médecin
  async getDoctorPrescriptions(req, res) {
    try {
      const { doctorId } = req.params;
      const { status } = req.query;

      if (req.user.role !== 'admin' && req.user.id != doctorId) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const prescriptions = await Prescription.getByDoctor(doctorId, status);

      res.json({
        count: prescriptions.length,
        prescriptions
      });
    } catch (error) {
      console.error('❌ Erreur récupération prescriptions médecin:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Vérifier la disponibilité des médicaments
  async checkAvailability(req, res) {
    try {
      const { id } = req.params;
      const items = await Prescription.getItems(id);

      const availability = await Promise.all(items.map(async (item) => {
        const available = await Stock.checkAvailability(
          item.medication_id, 
          item.quantity - item.quantity_dispensed
        );
        return {
          medication_id: item.medication_id,
          medication_name: item.medication_name,
          required: item.quantity - item.quantity_dispensed,
          available,
          stock: available ? 'Disponible' : 'Stock insuffisant'
        };
      }));

      res.json({
        prescription_id: id,
        all_available: availability.every(a => a.available),
        items: availability
      });
    } catch (error) {
      console.error('❌ Erreur vérification disponibilité:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Statistiques
  async getStats(req, res) {
    try {
      const { doctorId, startDate, endDate } = req.query;
      const stats = await Prescription.getStats(doctorId, startDate, endDate);

      // Ajouter les médicaments les plus prescrits
      const topMedications = await db.query(`
        SELECT 
          m.id,
          m.name,
          COUNT(pi.id) as prescription_count,
          SUM(pi.quantity) as total_quantity
        FROM prescription_items pi
        JOIN medications m ON pi.medication_id = m.id
        JOIN prescriptions p ON pi.prescription_id = p.id
        WHERE ($1::int IS NULL OR p.doctor_id = $1)
          AND ($2::date IS NULL OR p.prescription_date >= $2)
          AND ($3::date IS NULL OR p.prescription_date <= $3)
        GROUP BY m.id, m.name
        ORDER BY prescription_count DESC
        LIMIT 10
      `, [doctorId || null, startDate || null, endDate || null]);

      res.json({
        ...stats,
        top_medications: topMedications.rows
      });
    } catch (error) {
      console.error('❌ Erreur récupération stats:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Annuler une prescription
  async cancelPrescription(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const prescription = await Prescription.updateStatus(id, 'cancelled');

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription non trouvée' });
      }

      res.json({
        message: 'Prescription annulée',
        prescription
      });
    } catch (error) {
      console.error('❌ Erreur annulation prescription:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Prolonger une prescription
  async extendPrescription(req, res) {
    try {
      const { id } = req.params;
      const { new_expiry_date } = req.body;

      const prescription = await Prescription.findById(id);

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription non trouvée' });
      }

      if (prescription.status !== 'active') {
        return res.status(400).json({ error: 'Seules les prescriptions actives peuvent être prolongées' });
      }

      const updated = await db.query(`
        UPDATE prescriptions 
        SET expiry_date = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, new_expiry_date]);

      res.json({
        message: 'Prescription prolongée',
        prescription: updated.rows[0]
      });
    } catch (error) {
      console.error('❌ Erreur prolongation prescription:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new PrescriptionController();