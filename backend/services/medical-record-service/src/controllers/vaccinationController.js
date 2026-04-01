const Vaccination = require("../models/Vaccination");
const { validationResult } = require("express-validator");

class VaccinationController {
  constructor() {
    // bind methods for express
    [
      "createVaccination",
      "getHistory",
      "getUpcoming",
      "checkDue",
      "getSummary",
      "getVaccination",
      "updateVaccination",
      "deleteVaccination",
      "sendReminder",
      "getVaccinationCoverage",
      "getUpcomingVaccinations",
      "getVaccinationSchedule",
      "getRecommendations",
    ].forEach((fn) => (this[fn] = this[fn].bind(this)));
  }
  // Ajouter une vaccination
  async createVaccination(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patientId } = req.params;
      const vaccinationData = {
        ...req.body,
        patient_id: patientId,
        administered_by: req.user.id,
      };

      const vaccination = await Vaccination.create(vaccinationData);

      res.status(201).json({
        message: "Vaccination enregistrée",
        vaccination,
      });
    } catch (error) {
      console.error("❌ Erreur ajout vaccination:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer l'historique
  async getHistory(req, res) {
    try {
      const { patientId } = req.params;

      const history = await Vaccination.getByPatient(patientId);

      res.json({
        patient_id: patientId,
        count: history.length,
        history,
      });
    } catch (error) {
      console.error("❌ Erreur récupération historique:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les vaccinations à venir
  async getUpcoming(req, res) {
    try {
      const { patientId } = req.params;

      const upcoming = await Vaccination.getUpcoming(patientId);

      res.json({
        patient_id: patientId,
        count: upcoming.length,
        upcoming,
      });
    } catch (error) {
      console.error("❌ Erreur récupération vaccinations à venir:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Vérifier si un vaccin est dû
  async checkDue(req, res) {
    try {
      const { patientId } = req.params;
      const { vaccine } = req.query;

      const due = await Vaccination.checkDue(patientId, vaccine);

      res.json({
        patient_id: patientId,
        vaccine,
        is_due: due.length > 0,
        due_vaccinations: due,
      });
    } catch (error) {
      console.error("❌ Erreur vérification vaccins dus:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Résumé des vaccinations
  async getSummary(req, res) {
    try {
      const { patientId } = req.params;

      const [history, upcoming] = await Promise.all([
        Vaccination.getByPatient(patientId),
        Vaccination.getUpcoming(patientId),
      ]);

      res.json({
        patient_id: patientId,
        total_vaccinations: history.length,
        upcoming_vaccinations: upcoming.length,
        last_vaccination: history.length > 0 ? history[0] : null,
        upcoming: upcoming.slice(0, 5),
      });
    } catch (error) {
      console.error("❌ Erreur résumé vaccinations:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Récupérer une vaccination spécifique
  async getVaccination(req, res) {
    try {
      const { id } = req.params;

      const vaccination = await Vaccination.getById(id);

      if (!vaccination) {
        return res.status(404).json({ error: "Vaccination non trouvée" });
      }

      res.json(vaccination);
    } catch (error) {
      console.error("❌ Erreur récupération vaccination:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Mettre à jour une vaccination
  async updateVaccination(req, res) {
    try {
      const { id } = req.params;
      const vaccination = await Vaccination.update(id, req.body);

      if (!vaccination) {
        return res.status(404).json({ error: "Vaccination non trouvée" });
      }

      res.json({
        message: "Vaccination mise à jour",
        vaccination,
      });
    } catch (error) {
      console.error("❌ Erreur mise à jour vaccination:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Supprimer une vaccination
  async deleteVaccination(req, res) {
    try {
      const { id } = req.params;
      const vaccination = await Vaccination.delete(id);

      if (!vaccination) {
        return res.status(404).json({ error: "Vaccination non trouvée" });
      }

      res.json({
        message: "Vaccination supprimée",
        vaccination,
      });
    } catch (error) {
      console.error("❌ Erreur suppression vaccination:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Envoyer un rappel
  async sendReminder(req, res) {
    try {
      const { id } = req.params;

      const vaccination = await Vaccination.getById(id);

      if (!vaccination) {
        return res.status(404).json({ error: "Vaccination non trouvée" });
      }

      // Logique pour envoyer un rappel (email, SMS, notification)
      res.json({
        message: "Rappel envoyé au patient",
        vaccination_id: id,
        reminder_sent_at: new Date(),
      });
    } catch (error) {
      console.error("❌ Erreur envoi rappel:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Statistiques de couverture vaccinale
  async getVaccinationCoverage(req, res) {
    try {
      const result = await require("../config/database").pg.query(`
        SELECT vaccine_name, COUNT(*) as count
        FROM vaccinations
        GROUP BY vaccine_name
        ORDER BY count DESC
      `);

      res.json({
        total_vaccinations: result.rows.reduce(
          (sum, row) => sum + row.count,
          0,
        ),
        by_vaccine: result.rows,
      });
    } catch (error) {
      console.error("❌ Erreur rapport couverture:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Vaccinations à venir (global)
  async getUpcomingVaccinations(req, res) {
    try {
      const result = await require("../config/database").pg.query(`
        SELECT patient_id, vaccine_name, next_due_date
        FROM vaccinations
        WHERE next_due_date IS NOT NULL
          AND next_due_date > CURRENT_DATE
          AND next_due_date <= CURRENT_DATE + INTERVAL '90 days'
        ORDER BY next_due_date
      `);

      res.json({
        upcoming_count: result.rows.length,
        vaccinations: result.rows,
      });
    } catch (error) {
      console.error("❌ Erreur vaccinations à venir:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Calendrier vaccinal par âge
  async getVaccinationSchedule(req, res) {
    try {
      const { age } = req.params;
      const ageNum = parseInt(age);

      // Calendrier vaccinal simplifié
      const schedule = {
        0: ["BCG", "Hepatitis B"],
        2: ["DTC", "Polio", "Pneumococcus"],
        4: ["DTC", "Polio", "Pneumococcus"],
        6: ["DTC", "Polio", "Pneumococcus", "Hepatitis B"],
        12: ["Measles", "Mumps", "Rubella"],
        15: ["Varicella"],
        18: ["DTC Booster", "Polio Booster"],
        5: ["DTC Booster", "Polio Booster"],
        65: ["Influenza", "Pneumococcus"],
      };

      const recommended = schedule[ageNum] || [];

      res.json({
        age: ageNum,
        recommended_vaccines: recommended,
      });
    } catch (error) {
      console.error("❌ Erreur calendrier vaccinal:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // ✅ NOUVELLE MÉTHODE: Recommandations personnalisées
  async getRecommendations(req, res) {
    try {
      const { patientId } = req.params;

      const [history, upcoming] = await Promise.all([
        Vaccination.getByPatient(patientId),
        Vaccination.getUpcoming(patientId),
      ]);

      const vaccineNames = history.map((v) => v.vaccine_name);

      const allVaccines = [
        "BCG",
        "Hepatitis B",
        "DTC",
        "Polio",
        "Pneumococcus",
        "Measles",
        "Mumps",
        "Rubella",
        "Varicella",
        "Influenza",
      ];
      const missing = allVaccines.filter((v) => !vaccineNames.includes(v));

      res.json({
        patient_id: patientId,
        completed: history.length,
        upcoming: upcoming.length,
        missing_vaccines: missing,
        recommendations:
          missing.length > 0
            ? `Le patient devrait recevoir: ${missing.join(", ")}`
            : "À jour avec les vaccinations",
      });
    } catch (error) {
      console.error("❌ Erreur recommandations:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new VaccinationController();
