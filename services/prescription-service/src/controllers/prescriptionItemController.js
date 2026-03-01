const PrescriptionItem = require("../models/PrescriptionItem");
const Prescription = require("../models/Prescription");
const db = require("../config/database");
const { validationResult } = require("express-validator");

class PrescriptionItemController {
  // ... (code existant)

  // Vérifier la disponibilité d'un item spécifique
  async checkItemAvailability(req, res) {
    try {
      const { id } = req.params;
      const PharmacyService = require("../services/pharmacyService");

      const item = await PrescriptionItem.findById(id);
      if (!item) {
        return res.status(404).json({ error: "Item non trouvé" });
      }

      const available = await PharmacyService.checkMedicationAvailability(
        item.medication_id,
        item.quantity - item.quantity_dispensed,
      );

      res.json({
        item_id: id,
        medication_id: item.medication_id,
        medication_name: item.medication_name,
        required: item.quantity - item.quantity_dispensed,
        available,
        status: available ? "Disponible" : "Stock insuffisant",
      });
    } catch (error) {
      console.error("❌ Erreur vérification disponibilité item:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Valider un item spécifique
  async validateItem(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const item = await PrescriptionItem.findById(id);
      if (!item) {
        return res.status(404).json({ error: "Item non trouvé" });
      }

      // Mettre à jour le statut de validation (champ ajouté en base)
      await db.query(
        "UPDATE prescription_items SET validated = true, validated_at = CURRENT_TIMESTAMP, validation_notes = $2 WHERE id = $1",
        [id, notes],
      );

      res.json({
        message: "Item validé",
        item_id: id,
      });
    } catch (error) {
      console.error("❌ Erreur validation item:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
  // ... (reste du code)

  // Mettre à jour un item
  async updateItem(req, res) {
    try {
      const { id } = req.params;
      const item = await PrescriptionItem.findById(id);

      if (!item) {
        return res.status(404).json({ error: "Item non trouvé" });
      }

      // Vérifier les permissions
      const prescription = await Prescription.findById(item.prescription_id);
      if (prescription.doctor_id !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      const updatedItem = await PrescriptionItem.update(id, req.body);

      res.json({
        message: "Item mis à jour",
        item: updatedItem,
      });
    } catch (error) {
      console.error("❌ Erreur mise à jour item:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Supprimer un item
  async deleteItem(req, res) {
    try {
      const { id } = req.params;
      const item = await PrescriptionItem.findById(id);

      if (!item) {
        return res.status(404).json({ error: "Item non trouvé" });
      }

      // Vérifier les permissions
      const prescription = await Prescription.findById(item.prescription_id);
      if (prescription.doctor_id !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      // Vérifier si déjà délivré
      if (item.quantity_dispensed > 0) {
        return res
          .status(400)
          .json({
            error: "Impossible de supprimer un item déjà partiellement délivré",
          });
      }

      const deletedItem = await PrescriptionItem.delete(id);

      res.json({
        message: "Item supprimé",
        item: deletedItem,
      });
    } catch (error) {
      console.error("❌ Erreur suppression item:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Obtenir le résumé d'une prescription
  async getPrescriptionSummary(req, res) {
    try {
      const { prescriptionId } = req.params;
      const summary =
        await PrescriptionItem.getPrescriptionSummary(prescriptionId);

      res.json(summary);
    } catch (error) {
      console.error("❌ Erreur récupération résumé:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new PrescriptionItemController();
