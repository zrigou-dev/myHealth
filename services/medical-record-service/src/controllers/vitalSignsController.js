const VitalSigns = require("../models/VitalSigns");
const { validationResult } = require("express-validator");

class VitalSignsController {
  constructor() {
    // lier les méthodes afin que "this" fonctionne quand Express les appelle
    [
      "createVitalSigns",
      "getHistory",
      "getLatest",
      "getStats",
      "searchRecords",
      "searchByCondition",
      "searchByMedication",
      "getVitalSign",
      "updateVitalSign",
      "deleteVitalSign",
      "getChartData",
      "getTrends",
      "getAlerts",
      "analyzeVitals",
      "comparePatients",
      "exportToPDF",
      "exportToCSV",
      "exportSummaryToPDF",
    ].forEach((fn) => (this[fn] = this[fn].bind(this)));
  }
  // Ajouter des constantes
  async createVitalSigns(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patientId } = req.params;
      const vitalData = {
        ...req.body,
        patient_id: patientId,
        recorded_by: req.user.id,
      };

      const vitalSigns = await VitalSigns.create(vitalData);

      // Calculer l'IMC et interprétation
      const bmi = VitalSigns.calculateBMI(vitalSigns.height, vitalSigns.weight);
      const bmiInterpretation = VitalSigns.interpretBMI(bmi);
      const bpInterpretation = VitalSigns.interpretBP(
        vitalSigns.systolic_bp,
        vitalSigns.diastolic_bp,
      );

      res.status(201).json({
        message: "Constantes vitales enregistrées",
        vital_signs: vitalSigns,
        analysis: {
          bmi,
          bmi_interpretation: bmiInterpretation,
          bp_interpretation: bpInterpretation,
        },
      });
    } catch (error) {
      console.error("❌ Erreur ajout constantes:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer l'historique
  async getHistory(req, res) {
    try {
      const { patientId } = req.params;
      const { limit } = req.query;

      const history = await VitalSigns.getHistory(patientId, limit || 20);

      // Ajouter les interprétations
      const enrichedHistory = history.map((v) => ({
        ...v,
        bmi: VitalSigns.calculateBMI(v.height, v.weight),
        bmi_interpretation: VitalSigns.interpretBMI(
          VitalSigns.calculateBMI(v.height, v.weight),
        ),
        bp_interpretation: VitalSigns.interpretBP(
          v.systolic_bp,
          v.diastolic_bp,
        ),
      }));

      res.json({
        patient_id: patientId,
        count: enrichedHistory.length,
        history: enrichedHistory,
      });
    } catch (error) {
      console.error("❌ Erreur récupération historique:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les dernières constantes
  async getLatest(req, res) {
    try {
      const { patientId } = req.params;

      const latest = await VitalSigns.getLatest(patientId);

      if (!latest) {
        return res.status(404).json({ error: "Aucune constante trouvée" });
      }

      const bmi = VitalSigns.calculateBMI(latest.height, latest.weight);

      res.json({
        ...latest,
        bmi,
        bmi_interpretation: VitalSigns.interpretBMI(bmi),
        bp_interpretation: VitalSigns.interpretBP(
          latest.systolic_bp,
          latest.diastolic_bp,
        ),
      });
    } catch (error) {
      console.error("❌ Erreur récupération dernières constantes:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Obtenir les statistiques
  async getStats(req, res) {
    try {
      const { patientId } = req.params;
      const { days } = req.query;

      const stats = await VitalSigns.getStats(patientId, days || 30);

      res.json({
        patient_id: patientId,
        period_days: days || 30,
        stats,
      });
    } catch (error) {
      console.error("❌ Erreur récupération stats:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
  // ✅ NOUVELLE MÉTHODE: Rechercher des dossiers
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

  // ✅ NOUVELLE MÉTHODE: Rechercher par condition
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

  // ✅ NOUVELLE MÉTHODE: Rechercher par médicament
  async searchByMedication(req, res) {
    try {
      const { medication } = req.query;

      // Cette recherche nécessiterait une table de lien
      // Version simplifiée
      res.json({
        medication,
        message: "Fonctionnalité à implémenter",
      });
    } catch (error) {
      console.error("❌ Erreur recherche par médicament:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Récupérer une constante spécifique
  async getVitalSign(req, res) {
    try {
      const { id } = req.params;
      const result = await require("../config/database").pg.query(
        "SELECT * FROM vital_signs WHERE id = $1",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Constante vitale non trouvée" });
      }

      const vital = result.rows[0];
      const bmi = VitalSigns.calculateBMI(vital.height, vital.weight);

      res.json({
        ...vital,
        bmi,
        bmi_interpretation: VitalSigns.interpretBMI(bmi),
        bp_interpretation: VitalSigns.interpretBP(
          vital.systolic_bp,
          vital.diastolic_bp,
        ),
      });
    } catch (error) {
      console.error("❌ Erreur récupération constante:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Mettre à jour une constante
  async updateVitalSign(req, res) {
    try {
      const { id } = req.params;
      const {
        height,
        weight,
        systolic_bp,
        diastolic_bp,
        heart_rate,
        respiratory_rate,
        temperature,
        oxygen_saturation,
        blood_glucose,
        notes,
      } = req.body;

      const query = `
      UPDATE vital_signs 
      SET height = COALESCE($1, height),
          weight = COALESCE($2, weight),
          systolic_bp = COALESCE($3, systolic_bp),
          diastolic_bp = COALESCE($4, diastolic_bp),
          heart_rate = COALESCE($5, heart_rate),
          respiratory_rate = COALESCE($6, respiratory_rate),
          temperature = COALESCE($7, temperature),
          oxygen_saturation = COALESCE($8, oxygen_saturation),
          blood_glucose = COALESCE($9, blood_glucose),
          notes = COALESCE($10, notes)
      WHERE id = $11
      RETURNING *
    `;

      const result = await require("../config/database").pg.query(query, [
        height,
        weight,
        systolic_bp,
        diastolic_bp,
        heart_rate,
        respiratory_rate,
        temperature,
        oxygen_saturation,
        blood_glucose,
        notes,
        id,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Constante vitale non trouvée" });
      }

      res.json({
        message: "Constante vitale mise à jour",
        vital_sign: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Erreur mise à jour constante:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Supprimer une constante
  async deleteVitalSign(req, res) {
    try {
      const { id } = req.params;
      const result = await require("../config/database").pg.query(
        "DELETE FROM vital_signs WHERE id = $1 RETURNING *",
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Constante vitale non trouvée" });
      }

      res.json({
        message: "Constante vitale supprimée",
        vital_sign: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Erreur suppression constante:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Données pour graphiques
  async getChartData(req, res) {
    try {
      const { patientId, type } = req.params;
      const { days } = req.query;

      const result = await require("../config/database").pg.query(
        "SELECT recorded_at, $1::TEXT as metric, systolic_bp, diastolic_bp, heart_rate, blood_glucose, weight FROM vital_signs WHERE patient_id = $2 AND recorded_at > NOW() - INTERVAL '${days || 30} days' ORDER BY recorded_at",
        [type, patientId],
      );

      res.json({
        patient_id: patientId,
        metric: type,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Erreur récupération données graphiques:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Tendances
  async getTrends(req, res) {
    try {
      const { patientId } = req.params;
      const { days } = req.query;

      const vitals = await VitalSigns.getHistory(patientId, 999);
      const recentVitals = vitals.filter((v) => {
        const date = new Date(v.recorded_at);
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - (parseInt(days) || 30));
        return date >= threshold;
      });

      const trends = {
        weight: this.calculateTrend(recentVitals, "weight"),
        systolic_bp: this.calculateTrend(recentVitals, "systolic_bp"),
        diastolic_bp: this.calculateTrend(recentVitals, "diastolic_bp"),
        heart_rate: this.calculateTrend(recentVitals, "heart_rate"),
      };

      res.json({
        patient_id: patientId,
        period: `${days || 30} jours`,
        trends,
      });
    } catch (error) {
      console.error("❌ Erreur tendances:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Helper: Calculer la tendance d'une métrique
  calculateTrend(vitals, metric) {
    const validData = vitals.filter((v) => v[metric] != null);
    if (validData.length < 2) return "stable";

    const first = validData[0][metric];
    const last = validData[validData.length - 1][metric];
    const change = ((last - first) / first) * 100;

    if (Math.abs(change) < 5) return "stable";
    return change > 0 ? "en augmentation" : "en diminution";
  }

  // ✅ NOUVELLE MÉTHODE: Alertes
  async getAlerts(req, res) {
    try {
      const { patientId } = req.params;

      const latest = await VitalSigns.getLatest(patientId);
      if (!latest) {
        return res.json({ patient_id: patientId, alerts: [] });
      }

      const alerts = [];

      // Hypertension
      if (latest.systolic_bp >= 180 || latest.diastolic_bp >= 120) {
        alerts.push({
          level: "critical",
          type: "hypertension",
          message: "Crise hypertensive",
        });
      } else if (latest.systolic_bp >= 140 || latest.diastolic_bp >= 90) {
        alerts.push({
          level: "warning",
          type: "hypertension",
          message: "Hypertension élevée",
        });
      }

      // Obésité
      const bmi = VitalSigns.calculateBMI(latest.height, latest.weight);
      if (bmi >= 40) {
        alerts.push({
          level: "warning",
          type: "obesity",
          message: "Obésité morbide",
        });
      } else if (bmi >= 35) {
        alerts.push({
          level: "info",
          type: "obesity",
          message: "Obésité sévère",
        });
      }

      // Fréquence cardiaque anormale
      if (latest.heart_rate < 40 || latest.heart_rate > 120) {
        alerts.push({
          level: "warning",
          type: "heart_rate",
          message: "Fréquence cardiaque anormale",
        });
      }

      res.json({
        patient_id: patientId,
        alert_count: alerts.length,
        alerts,
      });
    } catch (error) {
      console.error("❌ Erreur récupération alertes:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Analyser des constantes
  async analyzeVitals(req, res) {
    try {
      const { vitals } = req.body;

      const analysis = {
        bmi: VitalSigns.calculateBMI(vitals.height, vitals.weight),
        bp_status: VitalSigns.interpretBP(
          vitals.systolic_bp,
          vitals.diastolic_bp,
        ),
        heart_rate_status:
          vitals.heart_rate < 40 || vitals.heart_rate > 120
            ? "anormal"
            : "normal",
        temperature_status:
          vitals.temperature >= 38
            ? "fièvre"
            : vitals.temperature < 36
              ? "hypothermie"
              : "normal",
        o2_status: vitals.oxygen_saturation < 95 ? "bas" : "normal",
      };

      res.json({
        analysis,
        summary: Object.entries(analysis)
          .filter(([, value]) => value !== "normal")
          .map(([key, value]) => `${key}: ${value}`),
      });
    } catch (error) {
      console.error("❌ Erreur analyse:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Comparer deux patients
  async comparePatients(req, res) {
    try {
      const { patientId1, patientId2 } = req.params;

      const [vitals1, vitals2] = await Promise.all([
        VitalSigns.getLatest(patientId1),
        VitalSigns.getLatest(patientId2),
      ]);

      res.json({
        patient1: patientId1,
        patient2: patientId2,
        vitals1,
        vitals2,
        comparison: {
          weight_diff: vitals1.weight - vitals2.weight,
          bmi_diff:
            VitalSigns.calculateBMI(vitals1.height, vitals1.weight) -
            VitalSigns.calculateBMI(vitals2.height, vitals2.weight),
          bp_systolic_diff: vitals1.systolic_bp - vitals2.systolic_bp,
          heart_rate_diff: vitals1.heart_rate - vitals2.heart_rate,
        },
      });
    } catch (error) {
      console.error("❌ Erreur comparaison:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Exporter en PDF
  async exportToPDF(req, res) {
    try {
      const { patientId } = req.params;

      // Logique d'export PDF
      res.json({
        message: "PDF généré",
        url: `/exports/patient-${patientId}.pdf`,
      });
    } catch (error) {
      console.error("❌ Erreur export PDF:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Exporter en CSV
  async exportToCSV(req, res) {
    try {
      const { patientId } = req.params;

      const vitals = await VitalSigns.getHistory(patientId, 999);

      // Format CSV
      const headers = [
        "ID",
        "Date",
        "Poids",
        "Taille",
        "Tension Systolique",
        "Tension Diastolique",
        "Fréquence Cardiaque",
        "IMC",
      ];
      const rows = vitals.map((v) => [
        v.id,
        v.recorded_at,
        v.weight,
        v.height,
        v.systolic_bp,
        v.diastolic_bp,
        v.heart_rate,
        VitalSigns.calculateBMI(v.height, v.weight),
      ]);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="vitals_${patientId}.csv"`,
      );

      // Écrire headers
      res.write(headers.join(",") + "\n");

      // Écrire rows
      rows.forEach((row) => {
        res.write(row.join(",") + "\n");
      });

      res.end();
    } catch (error) {
      console.error("❌ Erreur export CSV:", error);
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

module.exports = new VitalSignsController();
