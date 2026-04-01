const Aggregator = require("../services/aggregator");
const MedicalRecord = require("../models/MedicalRecord");
const Allergy = require("../models/Allergy");
const VitalSigns = require("../models/VitalSigns");
const Vaccination = require("../models/Vaccination");
const Condition = require("../models/Condition");

class AggregationController {
  constructor() {
    [
      "getCompletePatientRecord",
      "getExternalData",
      "getTimeline",
      "getMedicalStats",
      "getPrintSummary",
    ].forEach((fn) => (this[fn] = this[fn].bind(this)));
  }
  // Agrégation complète du dossier patient
  async getCompletePatientRecord(req, res) {
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

      // Récupérer les données des autres services via l'aggregator
      const externalData = await Aggregator.aggregateFullRecord(
        patientId,
        req.headers.authorization,
      );

      // Dernières constantes
      const latestVitals = vitalSigns.length > 0 ? vitalSigns[0] : null;

      // Calculer les tendances
      const trends = await this.calculateTrends(patientId, vitalSigns);

      res.json({
        patient_id: patientId,
        summary: {
          allergies_count: allergies.length,
          conditions_count: conditions.length,
          vaccinations_count: vaccinations.length,
          consultations_count: externalData.appointments?.length || 0,
          prescriptions_count: externalData.prescriptions?.length || 0,
          lab_results_count: externalData.laboratory?.length || 0,
          last_visit: externalData.appointments?.[0]?.date || null,
          last_vitals: latestVitals?.recorded_at || null,
          bmi: latestVitals
            ? this.calculateBMI(latestVitals.height, latestVitals.weight)
            : externalData.patient
              ? this.calculateBMI(externalData.patient.height, externalData.patient.weight)
              : null,
        },
        local_data: {
          allergies,
          vital_signs: vitalSigns,
          vaccinations,
          conditions,
          trends,
        },
        documents: mongoData.documents || [],
        consultation_notes: mongoData.consultation_notes || [],
        external_data: externalData,
        timeline: await Aggregator.getTimeline(
          patientId,
          req.headers.authorization,
        ),
      });
    } catch (error) {
      console.error("❌ Erreur agrégation dossier:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer uniquement les données externes
  async getExternalData(req, res) {
    try {
      const { patientId } = req.params;
      const { services } = req.query; // Liste des services à inclure

      const externalData = await Aggregator.aggregateFullRecord(
        patientId,
        req.headers.authorization,
      );

      // Filtrer par service si demandé
      if (services) {
        const serviceList = services.split(",");
        const filtered = {};
        serviceList.forEach((service) => {
          if (externalData[service]) {
            filtered[service] = externalData[service];
          }
        });
        return res.json(filtered);
      }

      res.json(externalData);
    } catch (error) {
      console.error("❌ Erreur récupération données externes:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer la chronologie médicale
  async getTimeline(req, res) {
    try {
      const { patientId } = req.params;

      const timeline = await Aggregator.getTimeline(
        patientId,
        req.headers.authorization,
      );

      // Grouper par mois
      const groupedByMonth = this.groupTimelineByMonth(timeline);

      res.json({
        patient_id: patientId,
        total_events: timeline.length,
        timeline,
        grouped_by_month: groupedByMonth,
      });
    } catch (error) {
      console.error("❌ Erreur récupération timeline:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les statistiques médicales
  async getMedicalStats(req, res) {
    try {
      const { patientId } = req.params;
      const { days } = req.query;

      const externalData = await Aggregator.aggregateFullRecord(
        patientId,
        req.headers.authorization,
      );
      const localData = {
        allergies: await Allergy.getByPatient(patientId),
        conditions: await Condition.getByPatient(patientId),
        vitalStats: await VitalSigns.getStats(patientId, days || 30),
      };

      const stats = {
        consultations: {
          total: externalData.appointments?.length || 0,
          last_30_days: this.countLast30Days(externalData.appointments, "date"),
        },
        laboratory: {
          total: externalData.laboratory?.length || 0,
          abnormal: this.countAbnormalResults(externalData.laboratory),
          by_category: this.groupLabResultsByCategory(externalData.laboratory),
        },
        prescriptions: {
          total: externalData.prescriptions?.length || 0,
          active:
            externalData.prescriptions?.filter((p) => p.status === "active")
              .length || 0,
          by_medication: this.groupPrescriptionsByMedication(
            externalData.prescriptions,
          ),
        },
        allergies: {
          total: localData.allergies.length,
          active: localData.allergies.filter((a) => a.is_active).length,
          by_severity: this.groupBySeverity(localData.allergies),
        },
        conditions: {
          total: localData.conditions.length,
          active: localData.conditions.filter((c) => !c.is_resolved).length,
          by_type: this.groupConditionsByType(localData.conditions),
        },
        vital_trends: localData.vitalStats,
      };

      res.json(stats);
    } catch (error) {
      console.error("❌ Erreur récupération statistiques:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer un résumé pour impression/PDF
  async getPrintSummary(req, res) {
    try {
      const { patientId } = req.params;

      const [localData, externalData] = await Promise.all([
        Promise.all([
          Allergy.getByPatient(patientId, true),
          VitalSigns.getLatest(patientId),
          Vaccination.getByPatient(patientId),
          Condition.getByPatient(patientId, true),
        ]),
        Aggregator.aggregateFullRecord(patientId, req.headers.authorization),
      ]);

      const [allergies, latestVitals, vaccinations, conditions] = localData;

      const summary = {
        patient_id: patientId,
        generated_at: new Date(),
        active_allergies: allergies,
        active_conditions: conditions,
        current_vitals: latestVitals,
        recent_consultations: externalData.appointments?.slice(0, 5) || [],
        recent_prescriptions: externalData.prescriptions?.slice(0, 5) || [],
        recent_lab_results: externalData.laboratory?.slice(0, 5) || [],
        upcoming_vaccinations: vaccinations
          .filter(
            (v) => v.next_due_date && new Date(v.next_due_date) > new Date(),
          )
          .slice(0, 5),
      };

      res.json(summary);
    } catch (error) {
      console.error("❌ Erreur génération résumé:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Helper: Calculer l'IMC
  calculateBMI(height, weight) {
    if (!height || !weight) return null;
    const heightInM = height / 100;
    return parseFloat((weight / (heightInM * heightInM)).toFixed(1));
  }

  // Helper: Calculer les tendances
  async calculateTrends(patientId, vitalSigns) {
    if (vitalSigns.length < 2) return null;

    const trends = {
      weight: this.calculateTrend(
        vitalSigns.map((v) => ({ date: v.recorded_at, value: v.weight })),
      ),
      systolic_bp: this.calculateTrend(
        vitalSigns.map((v) => ({ date: v.recorded_at, value: v.systolic_bp })),
      ),
      diastolic_bp: this.calculateTrend(
        vitalSigns.map((v) => ({ date: v.recorded_at, value: v.diastolic_bp })),
      ),
      heart_rate: this.calculateTrend(
        vitalSigns.map((v) => ({ date: v.recorded_at, value: v.heart_rate })),
      ),
    };

    return trends;
  }

  // Helper: Calculer la tendance d'une série
  calculateTrend(data) {
    const validData = data.filter((d) => d.value != null);
    if (validData.length < 2) return "stable";

    const first = validData[0].value;
    const last = validData[validData.length - 1].value;
    const change = ((last - first) / first) * 100;

    if (Math.abs(change) < 5) return "stable";
    return change > 0 ? "en augmentation" : "en diminution";
  }

  // Helper: Compter les événements des 30 derniers jours
  countLast30Days(items, dateField) {
    if (!items) return 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return items.filter((item) => new Date(item[dateField]) >= thirtyDaysAgo)
      .length;
  }

  // Helper: Compter les résultats anormaux
  countAbnormalResults(results) {
    if (!results) return 0;
    return results.filter(
      (r) => r.is_abnormal || (r.flag && r.flag !== "normal"),
    ).length;
  }

  // Helper: Grouper les résultats par catégorie
  groupLabResultsByCategory(results) {
    if (!results) return {};

    return results.reduce((acc, result) => {
      const category = result.category || "Autre";
      if (!acc[category]) acc[category] = [];
      acc[category].push(result);
      return acc;
    }, {});
  }

  // Helper: Grouper les prescriptions par médicament
  groupPrescriptionsByMedication(prescriptions) {
    if (!prescriptions) return {};

    const medicationCount = {};
    prescriptions.forEach((pres) => {
      if (pres.items) {
        pres.items.forEach((item) => {
          const medName = item.medication_name;
          medicationCount[medName] = (medicationCount[medName] || 0) + 1;
        });
      }
    });

    return medicationCount;
  }

  // Helper: Grouper par sévérité
  groupBySeverity(items) {
    return items.reduce((acc, item) => {
      const severity = item.severity || "non spécifié";
      if (!acc[severity]) acc[severity] = 0;
      acc[severity]++;
      return acc;
    }, {});
  }

  // Helper: Grouper les conditions par type
  groupConditionsByType(conditions) {
    return conditions.reduce((acc, condition) => {
      const type = condition.is_chronic ? "chronique" : "aigu";
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {});
  }

  // Helper: Grouper la timeline par mois
  groupTimelineByMonth(timeline) {
    const grouped = {};

    timeline.forEach((event) => {
      const date = new Date(event.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped[monthYear]) {
        grouped[monthYear] = {
          month: monthYear,
          events: [],
          count: 0,
        };
      }

      grouped[monthYear].events.push(event);
      grouped[monthYear].count++;
    });

    return Object.values(grouped).sort((a, b) =>
      b.month.localeCompare(a.month),
    );
  }
}

module.exports = new AggregationController();
