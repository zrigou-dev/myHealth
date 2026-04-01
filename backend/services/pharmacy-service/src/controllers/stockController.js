const Stock = require('../models/Stock');
const { validationResult } = require('express-validator');
const db = require('../config/database');
class StockController {
  // Ajouter un lot
  async addBatch(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const batch = await Stock.addBatch(req.body);

      res.status(201).json({
        message: 'Lot ajouté avec succès',
        batch
      });
    } catch (error) {
      console.error('❌ Erreur ajout lot:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Voir le stock d'un médicament
  async getStock(req, res) {
    try {
      const { medicationId } = req.params;
      const stock = await Stock.getStock(medicationId);

      const total = stock.reduce((sum, b) => sum + parseInt(b.quantity), 0);

      res.json({
        medication_id: medicationId,
        total_quantity: total,
        batches: stock
      });
    } catch (error) {
      console.error('❌ Erreur récupération stock:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Voir tous les stocks
  async getAllStock(req, res) {
    try {
      const stock = await Stock.getAllStock();
      res.json(stock);
    } catch (error) {
      console.error('❌ Erreur récupération stocks:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Obtenir les alertes
  async getAlerts(req, res) {
    try {
      const { resolved } = req.query;
      const alerts = await Stock.getAlerts(resolved === 'true');

      res.json({
        count: alerts.length,
        alerts
      });
    } catch (error) {
      console.error('❌ Erreur récupération alertes:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Résoudre une alerte
  async resolveAlert(req, res) {
    try {
      const { id } = req.params;
      const alert = await Stock.resolveAlert(id);

      if (!alert) {
        return res.status(404).json({ error: 'Alerte non trouvée' });
      }

      res.json({
        message: 'Alerte résolue',
        alert
      });
    } catch (error) {
      console.error('❌ Erreur résolution alerte:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Mettre à jour un lot (quantité)
  async updateBatch(req, res) {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      const batch = await Stock.updateQuantity(id, quantity);

      res.json({
        message: 'Lot mis à jour',
        batch
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour lot:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Vérifier le stock pour une prescription
  async checkPrescriptionStock(req, res) {
    try {
      const { prescriptionId } = req.params;
      const items = await require('../models/Prescription').getItems(prescriptionId);

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
          batch: available ? await this.findAvailableBatch(item.medication_id) : null
        };
      }));

      res.json({
        prescription_id: prescriptionId,
        all_available: availability.every(a => a.available),
        items: availability
      });
    } catch (error) {
      console.error('❌ Erreur vérification stock prescription:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Trouver un lot disponible
  async findAvailableBatch(medicationId) {
    const result = await db.query(`
      SELECT * FROM medication_batches
      WHERE medication_id = $1
        AND quantity > 0
        AND expiry_date > CURRENT_DATE
      ORDER BY expiry_date
      LIMIT 1
    `, [medicationId]);

    return result.rows[0] || null;
  }

  // Statistiques des stocks
  async getStockStats(req, res) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(DISTINCT medication_id) as medications_in_stock,
          SUM(quantity) as total_items,
          SUM(CASE WHEN quantity <= $1 THEN 1 ELSE 0 END) as low_stock_count,
          COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon
        FROM medication_batches
        WHERE is_active = true
      `, [process.env.LOW_STOCK_THRESHOLD || 10]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('❌ Erreur récupération stats stock:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new StockController();