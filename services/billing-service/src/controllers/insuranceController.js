const db = require("../config/database");
const Insurance = require("../models/Insurance");
const Invoice = require("../models/Invoice");
const { validationResult } = require("express-validator");

class InsuranceController {
  // Créer une demande d'assurance
  async createClaim(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        invoice_id,
        insurance_provider,
        policy_number,
        documents,
        notes,
      } = req.body;

      // Vérifier que la facture existe
      const invoice = await Invoice.findById(invoice_id);
      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }

      // Vérifier que le patient est bien le propriétaire
      if (invoice.patient_id !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Non autorisé" });
      }

      const claim = await Insurance.createClaim({
        invoice_id,
        patient_id: req.user.id,
        insurance_provider,
        policy_number,
        claim_amount: invoice.total_amount,
        documents,
        notes,
      });

      res.status(201).json({
        message: "Demande d'assurance créée avec succès",
        claim,
      });
    } catch (error) {
      console.error("❌ Erreur création demande assurance:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer mes demandes (patient)
  async getMyClaims(req, res) {
    try {
      const claims = await Insurance.getByPatient(req.user.id);
      res.json({
        count: claims.length,
        claims,
      });
    } catch (error) {
      console.error("❌ Erreur récupération demandes:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer une demande spécifique
  async getClaim(req, res) {
    try {
      const { id } = req.params;
      const claim = await Insurance.findByNumber(id);

      if (!claim) {
        return res.status(404).json({ error: "Demande non trouvée" });
      }

      // Vérifier les permissions
      if (claim.patient_id !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Non autorisé" });
      }

      res.json(claim);
    } catch (error) {
      console.error("❌ Erreur récupération demande:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Mettre à jour le statut d'une demande (admin)
  async updateClaimStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, approved_amount } = req.body;

      const claim = await Insurance.updateStatus(id, status, approved_amount);

      if (!claim) {
        return res.status(404).json({ error: "Demande non trouvée" });
      }

      // Si approuvée, on peut mettre à jour la facture
      if (status === "approved" && approved_amount) {
        await db.query(
          "UPDATE invoices SET insurance_coverage = $2 WHERE id = $1",
          [claim.invoice_id, approved_amount],
        );
      }

      res.json({
        message: "Statut mis à jour",
        claim,
      });
    } catch (error) {
      console.error("❌ Erreur mise à jour statut:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les demandes en attente (admin)
  async getPendingClaims(req, res) {
    try {
      const claims = await Insurance.getPendingClaims();
      res.json({
        count: claims.length,
        claims,
      });
    } catch (error) {
      console.error("❌ Erreur récupération demandes en attente:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Statistiques des assurances (admin)
  async getInsuranceStats(req, res) {
    try {
      const { provider } = req.query;
      const stats = await Insurance.getStats(provider);
      res.json(stats);
    } catch (error) {
      console.error("❌ Erreur récupération statistiques:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new InsuranceController();
