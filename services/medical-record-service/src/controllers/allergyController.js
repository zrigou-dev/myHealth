const Allergy = require("../models/Allergy");
const { validationResult } = require("express-validator");

class AllergyController {
  // Ajouter une allergie
  async createAllergy(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patientId } = req.params;
      const allergyData = {
        ...req.body,
        patient_id: patientId,
        diagnosed_by: req.user.id,
      };

      const allergy = await Allergy.create(allergyData);

      res.status(201).json({
        message: "Allergie ajoutée",
        allergy,
      });
    } catch (error) {
      console.error("❌ Erreur ajout allergie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les allergies d'un patient
  async getPatientAllergies(req, res) {
    try {
      const { patientId } = req.params;
      const { active_only } = req.query;

      const allergies = await Allergy.getByPatient(
        patientId,
        active_only !== "false",
      );

      res.json({
        patient_id: patientId,
        count: allergies.length,
        allergies,
      });
    } catch (error) {
      console.error("❌ Erreur récupération allergies:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Récupérer une allergie spécifique
  async getAllergy(req, res) {
    try {
      const { id } = req.params;

      const result = await require("../config/database").pg.query(
        "SELECT * FROM allergies WHERE id = $1",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Allergie non trouvée" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("❌ Erreur récupération allergie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Mettre à jour une allergie
  async updateAllergy(req, res) {
    try {
      const { id } = req.params;
      const allergy = await Allergy.update(id, req.body);

      if (!allergy) {
        return res.status(404).json({ error: "Allergie non trouvée" });
      }

      res.json({
        message: "Allergie mise à jour",
        allergy,
      });
    } catch (error) {
      console.error("❌ Erreur mise à jour allergie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Désactiver une allergie
  async deactivateAllergy(req, res) {
    try {
      const { id } = req.params;
      const allergy = await Allergy.deactivate(id);

      if (!allergy) {
        return res.status(404).json({ error: "Allergie non trouvée" });
      }

      res.json({
        message: "Allergie désactivée",
        allergy,
      });
    } catch (error) {
      console.error("❌ Erreur désactivation allergie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Réactiver une allergie
  async reactivateAllergy(req, res) {
    try {
      const { id } = req.params;

      const allergy = await Allergy.reactivate(id);

      if (!allergy) {
        return res.status(404).json({ error: "Allergie non trouvée" });
      }

      res.json({
        message: "Allergie réactivée",
        allergy,
      });
    } catch (error) {
      console.error("❌ Erreur réactivation allergie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Supprimer une allergie
  async deleteAllergy(req, res) {
    try {
      const { id } = req.params;
      const allergy = await Allergy.delete(id);

      if (!allergy) {
        return res.status(404).json({ error: "Allergie non trouvée" });
      }

      res.json({
        message: "Allergie supprimée",
        allergy,
      });
    } catch (error) {
      console.error("❌ Erreur suppression allergie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Statistiques des allergies courantes
  async getCommonAllergies(req, res) {
    try {
      const allergies = await Allergy.getCommonAllergies(10);

      res.json({
        total: allergies.length,
        common_allergies: allergies,
      });
    } catch (error) {
      console.error("❌ Erreur récupération stats allergies:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new AllergyController();
