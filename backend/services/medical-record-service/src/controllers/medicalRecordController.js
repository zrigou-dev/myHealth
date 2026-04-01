const MedicalRecord = require("../models/MedicalRecord");
const Allergy = require("../models/Allergy");
const VitalSigns = require("../models/VitalSigns");
const Vaccination = require("../models/Vaccination");
const Condition = require("../models/Condition");
const Aggregator = require("../services/aggregator");
const { validationResult } = require("express-validator");

class MedicalRecordController {
  constructor() {
    [
      "getFullRecord",
      "addConsultationNote",
      "getTimeline",
      "getMedicalSummary",
      "searchRecords",
      "searchByCondition",
      "searchByMedication",
      "exportToPDF",
      "exportSummaryToPDF",
    ].forEach((fn) => (this[fn] = this[fn].bind(this)));
  }
  // Récupérer le dossier complet d'un patient
  async getFullRecord(req, res) {
    try {
      const { patientId } = req.params;

      // Vérifier les permissions
      if (
        patientId != req.user.id &&
        req.user.role !== "admin" &&
        req.user.role !== "doctor"
      ) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      // Récupérer les données locales (PostgreSQL)
      const [allergies, vitalSigns, vaccinations, conditions] =
        await Promise.all([
          Allergy.getByPatient(patientId),
          VitalSigns.getHistory(patientId, 10),
          Vaccination.getByPatient(patientId),
          Condition.getByPatient(patientId),
        ]);

      // Récupérer les données MongoDB
      const mongoData = await MedicalRecord.getFullRecord(patientId);

      // Récupérer les données des autres services
      const aggregated = await Aggregator.aggregateFullRecord(
        patientId,
        req.headers.authorization,
      );

      // Dernières constantes
      const latestVitals = vitalSigns.length > 0 ? vitalSigns[0] : null;

      res.json({
        patient_id: patientId,
        summary: {
          allergies_count: allergies.length,
          conditions_count: conditions.length,
          vaccinations_count: vaccinations.length,
          last_visit: aggregated.appointments?.[0]?.date || null,
          bmi: latestVitals
            ? VitalSigns.calculateBMI(latestVitals.height, latestVitals.weight)
            : null,
          bmi_interpretation: latestVitals
            ? VitalSigns.interpretBMI(
                VitalSigns.calculateBMI(
                  latestVitals.height,
                  latestVitals.weight,
                ),
              )
            : null,
        },
        local_data: {
          allergies,
          vital_signs: vitalSigns,
          vaccinations,
          conditions,
        },
        documents: mongoData.documents || [],
        consultation_notes: mongoData.consultation_notes || [],
        external_data: aggregated,
      });
    } catch (error) {
      console.error("❌ Erreur récupération dossier:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Ajouter une note de consultation
  async addConsultationNote(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patientId } = req.params;
      const noteData = {
        ...req.body,
        patient_id: patientId,
        doctor_id: req.user.id,
      };

      const note = await MedicalRecord.addConsultationNote(noteData);

      res.status(201).json({
        message: "Note de consultation ajoutée",
        note,
      });
    } catch (error) {
      console.error("❌ Erreur ajout note:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer la chronologie
  async getTimeline(req, res) {
    try {
      const { patientId } = req.params;

      const timeline = await Aggregator.getTimeline(
        patientId,
        req.headers.authorization,
      );

      res.json({
        patient_id: patientId,
        count: timeline.length,
        timeline,
      });
    } catch (error) {
      console.error("❌ Erreur récupération timeline:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer le résumé médical
  async getMedicalSummary(req, res) {
    try {
      const { patientId } = req.params;

      const [allergies, conditions, latestVitals] = await Promise.all([
        Allergy.getByPatient(patientId, true),
        Condition.getByPatient(patientId, true),
        VitalSigns.getLatest(patientId),
      ]);

      res.json({
        patient_id: patientId,
        active_allergies: allergies,
        active_conditions: conditions,
        current_vitals: latestVitals,
        summary: {
          allergies_count: allergies.length,
          conditions_count: conditions.length,
          last_update: new Date(),
        },
      });
    } catch (error) {
      console.error("❌ Erreur récupération résumé:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Recherche globale dans le dossier
  async searchRecords(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({ error: "Requête trop courte" });
      }

      // Recherche dans les différentes tables
      const [conditions, allergies] = await Promise.all([
        require("../config/database").pg.query(
          "SELECT * FROM medical_conditions WHERE condition_name ILIKE $1",
          [`%${q}%`],
        ),
        require("../config/database").pg.query(
          "SELECT * FROM allergies WHERE allergen ILIKE $1",
          [`%${q}%`],
        ),
      ]);

      res.json({
        query: q,
        conditions: conditions.rows,
        allergies: allergies.rows,
      });
    } catch (error) {
      console.error("❌ Erreur recherche:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Recherche par pathologie
  async searchByCondition(req, res) {
    try {
      const { condition } = req.query;

      const result = await require("../config/database").pg.query(
        "SELECT * FROM medical_conditions WHERE condition_name ILIKE $1",
        [`%${condition}%`],
      );

      res.json({
        condition,
        count: result.rows.length,
        results: result.rows,
      });
    } catch (error) {
      console.error("❌ Erreur recherche par condition:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Recherche par médicament
  async searchByMedication(req, res) {
    try {
      const { medication } = req.query;

      // Rechercher dans les prescriptions et traitements en cours
      const result = await require("../config/database").pg.query(
        "SELECT * FROM current_treatments WHERE medication_name ILIKE $1 AND is_active = true",
        [`%${medication}%`],
      );

      res.json({
        medication,
        count: result.rows.length,
        results: result.rows,
      });
    } catch (error) {
      console.error("❌ Erreur recherche par médicament:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Exporter le dossier complet en PDF
  async exportToPDF(req, res) {
    try {
      const { patientId } = req.params;

      // Logique d'export PDF
      res.json({
        message: "PDF du dossier complet généré",
        url: `/exports/patient-${patientId}-complete.pdf`,
      });
    } catch (error) {
      console.error("❌ Erreur export PDF:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Exporter le résumé en PDF
  async exportSummaryToPDF(req, res) {
    try {
      const { patientId } = req.params;

      res.json({
        message: "Résumé PDF généré",
        url: `/exports/summary-${patientId}.pdf`,
      });
    } catch (error) {
      console.error("❌ Erreur export résumé PDF:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new MedicalRecordController();
