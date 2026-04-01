// controller responsible for prescription validation endpoints
const Prescription = require("../models/Prescription");
const PrescriptionItem = require("../models/PrescriptionItem");
const MedicationService = require("../services/medicationService");
const DrugInteractions = require("../utils/drugInteractions");
const Validators = require("../utils/validators");

class PrescriptionValidationController {
  /**
   * Vérifie les interactions entre un tableau de médicaments
   * Exige body.medicationIds = [id1, id2, ...]
   */
  async checkInteractions(req, res) {
    try {
      const { medicationIds } = req.body;
      if (!Array.isArray(medicationIds) || medicationIds.length < 2) {
        return res
          .status(400)
          .json({ error: "Au moins 2 IDs de médicaments requis" });
      }

      const interactions =
        await DrugInteractions.checkInteractions(medicationIds);
      res.json({ interactions });
    } catch (error) {
      console.error("❌ Erreur vérification interactions :", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  /**
   * Valide un dosage à partir des paramètres fournis
   * Utilise la logique métier de utils/validators.js
   */
  async validateDosage(req, res) {
    try {
      const {
        medication_id,
        dosage_value,
        dosage_unit,
        frequency_value,
        frequency_unit,
        duration_value,
        duration_unit,
        patient_age,
        patient_weight,
      } = req.body;

      // récupérer les informations du médicament si besoin
      const medication = medication_id
        ? await MedicationService.getMedication(medication_id)
        : null;

      const warnings = [];
      if (dosage_value != null && medication_id != null) {
        if (!Validators.isValidDosage(dosage_value, medication_id)) {
          warnings.push("Dose potentiellement excessive pour ce médicament");
        }
      }
      if (frequency_value != null && frequency_unit) {
        if (!Validators.isValidFrequency(frequency_value, frequency_unit)) {
          warnings.push("Fréquence de prise potentiellement excessive");
        }
      }
      if (duration_value != null && duration_unit) {
        if (!Validators.isValidDuration(duration_value, duration_unit)) {
          warnings.push("Durée de traitement potentiellement excessive");
        }
      }

      res.json({
        valid: warnings.length === 0,
        warnings,
        medication,
      });
    } catch (error) {
      console.error("❌ Erreur validation dosage :", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  /**
   * Valide l'ordonnance complète (interactions + dosages de chaque ligne)
   */
  async validateFullPrescription(req, res) {
    try {
      const { id } = req.params;
      const prescription = await Prescription.findById(id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription non trouvée" });
      }

      const items = await Prescription.getItems(id);
      const medicationIds = items.map((i) => i.medication_id).filter((x) => x);

      const interactions =
        await DrugInteractions.checkInteractions(medicationIds);
      const dosageResults = [];

      for (const item of items) {
        const validDosage = Validators.isValidDosage(
          item.dosage_value || 0,
          item.medication_id,
        );
        dosageResults.push({
          item_id: item.id,
          medication_id: item.medication_id,
          valid: validDosage,
        });
      }

      res.json({
        prescription,
        items,
        interactions,
        dosage: dosageResults,
      });
    } catch (error) {
      console.error("❌ Erreur validation prescription complète :", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new PrescriptionValidationController();
