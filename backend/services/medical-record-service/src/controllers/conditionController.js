const Condition = require("../models/Condition");
const { validationResult } = require("express-validator");

class ConditionController {
  constructor() {
    [
      "createCondition",
      "getPatientConditions",
      "resolveCondition",
      "updateCondition",
      "getCondition",
      "deleteCondition",
    ].forEach((fn) => (this[fn] = this[fn].bind(this)));
  }
  // Ajouter un antécédent
  async createCondition(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patientId } = req.params;
      const conditionData = {
        ...req.body,
        patient_id: patientId,
        diagnosed_by: req.user.id,
      };

      const condition = await Condition.create(conditionData);

      res.status(201).json({
        message: "Antécédent ajouté",
        condition,
      });
    } catch (error) {
      console.error("❌ Erreur ajout antécédent:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les antécédents
  async getPatientConditions(req, res) {
    try {
      const { patientId } = req.params;
      const { active_only } = req.query;

      const conditions = await Condition.getByPatient(
        patientId,
        active_only === "true",
      );

      res.json({
        patient_id: patientId,
        count: conditions.length,
        conditions,
      });
    } catch (error) {
      console.error("❌ Erreur récupération antécédents:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Marquer comme résolu
  async resolveCondition(req, res) {
    try {
      const { id } = req.params;
      const { resolved_date } = req.body;

      const condition = await Condition.resolve(id, resolved_date);

      if (!condition) {
        return res.status(404).json({ error: "Antécédent non trouvé" });
      }

      res.json({
        message: "Antécédent marqué comme résolu",
        condition,
      });
    } catch (error) {
      console.error("❌ Erreur résolution antécédent:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Mettre à jour
  async updateCondition(req, res) {
    try {
      const { id } = req.params;
      const condition = await Condition.update(id, req.body);

      if (!condition) {
        return res.status(404).json({ error: "Antécédent non trouvé" });
      }

      res.json({
        message: "Antécédent mis à jour",
        condition,
      });
    } catch (error) {
      console.error("❌ Erreur mise à jour antécédent:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Récupérer un antécédent spécifique
  async getCondition(req, res) {
    try {
      const { id } = req.params;

      const condition = await Condition.getById(id);

      if (!condition) {
        return res.status(404).json({ error: "Antécédent non trouvé" });
      }

      res.json(condition);
    } catch (error) {
      console.error("❌ Erreur récupération antécédent:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Supprimer un antécédent
  async deleteCondition(req, res) {
    try {
      const { id } = req.params;
      const condition = await Condition.delete(id);

      if (!condition) {
        return res.status(404).json({ error: "Antécédent non trouvé" });
      }

      res.json({
        message: "Antécédent supprimé",
        condition,
      });
    } catch (error) {
      console.error("❌ Erreur suppression antécédent:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new ConditionController();
