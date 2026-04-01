const Prescription = require("../models/Prescription");
const PrescriptionItem = require("../models/PrescriptionItem");
const PrescriptionTemplate = require("../models/PrescriptionTemplate");
const PatientService = require("../services/patientService");
const DoctorService = require("../services/doctorService");
const PharmacyService = require("../services/pharmacyService");
const MedicationService = require("../services/medicationService");
const PDFGenerator = require("../utils/pdfGenerator");
const DrugInteractions = require("../utils/drugInteractions");
const { validationResult } = require("express-validator");
const db = require("../config/database");
const UserService = require("../services/userService");

class PrescriptionController {
  // Créer une prescription
  async createPrescription(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, ...prescriptionData } = req.body;

      // Valider le médecin
      const doctorExists = await DoctorService.validateDoctor(
        prescriptionData.doctor_id,
      );
      if (!doctorExists) {
        return res.status(400).json({ error: "Médecin invalide" });
      }

      // Vérifier les interactions médicamenteuses
      const medicationIds = items
        .map((i) => i.medication_id)
        .filter((id) => id);
      if (medicationIds.length > 1) {
        const interactions =
          await MedicationService.checkInteractions(medicationIds);
        if (interactions.severe && interactions.severe.length > 0) {
          return res.status(400).json({
            error: "Interactions médicamenteuses sévères détectées",
            interactions: interactions.severe,
          });
        }
      }

      // Créer la prescription
      const prescription = await Prescription.create({
        ...prescriptionData,
        created_by: req.user.id,
      });

      // Ajouter les items
      const prescriptionItems = await Prescription.addItems(
        prescription.id,
        items,
      );

      res.status(201).json({
        message: "Prescription créée avec succès",
        prescription: {
          ...prescription,
          items: prescriptionItems,
        },
      });
    } catch (error) {
      console.error("❌ Erreur création prescription:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer une prescription
  async getPrescription(req, res) {
    try {
      // s'assurer que les validations express-validator ont été exécutées
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const prescription = await Prescription.findById(id);

      if (!prescription) {
        return res.status(404).json({ error: "Prescription non trouvée" });
      }

      // Vérifier les permissions
      if (
        prescription.patient_id !== req.user.id &&
        prescription.doctor_id !== req.user.id &&
        req.user.role !== "admin" &&
        req.user.role !== "pharmacist"
      ) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      const items = await Prescription.getItems(id);
      const summary = await PrescriptionItem.getPrescriptionSummary(id);

      // Récupérer les infos patient et médecin
      const patient = await PatientService.getPatient(
        prescription.patient_id,
        req.headers.authorization,
      );
      const doctor = await DoctorService.getDoctor(prescription.doctor_id);

      res.json({
        ...prescription,
        patient,
        doctor,
        items,
        summary,
      });
    } catch (error) {
      console.error("❌ Erreur récupération prescription:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer mes prescriptions (patient)
  async getMyPrescriptions(req, res) {
    try {
      const { status, fromDate, toDate } = req.query;
      const prescriptions = await Prescription.getByPatient(req.user.id, {
        status,
        fromDate,
        toDate,
      });

      res.json({
        count: prescriptions.length,
        prescriptions,
      });
    } catch (error) {
      console.error("❌ Erreur récupération prescriptions:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les prescriptions d'un patient (pour agrégation)
  async getPatientPrescriptions(req, res) {
    try {
      const { patientId } = req.params;
      const prescriptions = await Prescription.getByPatient(patientId);
      res.json(prescriptions);
    } catch (error) {
      console.error("❌ Erreur récupération prescriptions patient:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les prescriptions d'un médecin
  getDoctorPrescriptions = async (req, res) => {
    try {
      const { doctorId } = req.params;
      const { status, fromDate } = req.query;

      if (req.user.role !== "admin" && req.user.id != doctorId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      const prescriptions = await Prescription.getByDoctor(doctorId, {
        status,
        fromDate,
      });

      // Hydrate with patient info
      const hydratedPrescriptions = await this._hydratePrescriptions(prescriptions);

      res.json({
        count: hydratedPrescriptions.length,
        prescriptions: hydratedPrescriptions,
      });
    } catch (error) {
      console.error("❌ Erreur récupération prescriptions médecin:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Valider une prescription
  async validatePrescription(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const prescription = await Prescription.validate(id, req.user.id, notes);

      if (!prescription) {
        return res.status(404).json({ error: "Prescription non trouvée" });
      }

      res.json({
        message: "Prescription validée",
        prescription,
      });
    } catch (error) {
      console.error("❌ Erreur validation prescription:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Renouveler une prescription
  async renewPrescription(req, res) {
    try {
      const { id } = req.params;

      const newPrescription = await Prescription.renew(id, {}, req.user.id);

      res.status(201).json({
        message: "Prescription renouvelée",
        prescription: newPrescription,
      });
    } catch (error) {
      console.error("❌ Erreur renouvellement prescription:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Annuler une prescription
  async cancelPrescription(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const prescription = await Prescription.updateStatus(
        id,
        "cancelled",
        req.user.id,
      );

      if (!prescription) {
        return res.status(404).json({ error: "Prescription non trouvée" });
      }

      res.json({
        message: "Prescription annulée",
        prescription,
      });
    } catch (error) {
      console.error("❌ Erreur annulation prescription:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Vérifier la disponibilité
  async checkAvailability(req, res) {
    try {
      const { id } = req.params;
      const items = await Prescription.getItems(id);

      const availability = await Promise.all(
        items.map(async (item) => {
          const available = await PharmacyService.checkMedicationAvailability(
            item.medication_id,
            item.quantity - item.quantity_dispensed,
          );
          return {
            item_id: item.id,
            medication_id: item.medication_id,
            medication_name: item.medication_name,
            required: item.quantity - item.quantity_dispensed,
            available,
            status: available ? "Disponible" : "Stock insuffisant",
          };
        }),
      );

      res.json({
        prescription_id: id,
        all_available: availability.every((a) => a.available),
        items: availability,
      });
    } catch (error) {
      console.error("❌ Erreur vérification disponibilité:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Générer PDF
  async generatePDF(req, res) {
    try {
      const { id } = req.params;

      const prescription = await Prescription.findById(id);
      if (!prescription) {
        return res.status(404).json({ error: "Prescription non trouvée" });
      }

      const items = await Prescription.getItems(id);
      const patient = await PatientService.getPatient(
        prescription.patient_id,
        req.headers.authorization,
      );
      const doctor = await DoctorService.getDoctor(prescription.doctor_id);

      const pdfBuffer = await PDFGenerator.generatePrescription({
        prescription,
        items,
        patient,
        doctor,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=ordonnance-${prescription.prescription_number}.pdf`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("❌ Erreur génération PDF:", error);
      res.status(500).json({ error: "Erreur génération PDF" });
    }
  }

  // Statistiques
  async getStats(req, res) {
    try {
      const { doctorId, fromDate, toDate } = req.query;
      const stats = await Prescription.getStats({ doctorId, fromDate, toDate });

      // Ajouter les médicaments les plus prescrits
      const topMedications = await db.query(
        `
        SELECT 
          pi.medication_id,
          pi.medication_name,
          COUNT(DISTINCT p.id) as prescription_count,
          SUM(pi.quantity) as total_quantity
        FROM prescription_items pi
        JOIN prescriptions p ON pi.prescription_id = p.id
        WHERE ($1::int IS NULL OR p.doctor_id = $1)
          AND ($2::date IS NULL OR p.prescription_date >= $2)
          AND ($3::date IS NULL OR p.prescription_date <= $3)
        GROUP BY pi.medication_id, pi.medication_name
        ORDER BY prescription_count DESC
        LIMIT 10
      `,
        [doctorId || null, fromDate || null, toDate || null],
      );

      res.json({
        ...stats,
        top_medications: topMedications.rows,
      });
    } catch (error) {
      console.error("❌ Erreur récupération stats:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Rechercher des prescriptions
  searchPrescriptions = async (req, res) => {
    try {
      const searchParams = req.query;
      const prescriptions = await Prescription.search(searchParams);

      // Hydrate with patient and doctor info
      const hydratedPrescriptions = await this._hydratePrescriptions(prescriptions);

      res.json({
        count: hydratedPrescriptions.length,
        prescriptions: hydratedPrescriptions,
      });
    } catch (error) {
      console.error("❌ Erreur recherche prescriptions:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Envoyer à une pharmacie
  async sendToPharmacy(req, res) {
    try {
      const { id } = req.params;
      const { pharmacy_id } = req.body;
      console.log(`📨 Attempting to send prescription ${id} to pharmacy ${pharmacy_id}`);

      if (!pharmacy_id) {
        return res.status(400).json({ error: "ID de pharmacie requis" });
      }

      const prescription = await Prescription.sendToPharmacy(id, pharmacy_id);

      if (!prescription) {
        console.log(`❌ Prescription ${id} not found or not active for sending`);
        return res.status(404).json({ error: "Prescription non trouvée ou non active" });
      }

      console.log(`✅ Prescription ${id} successfully sent to pharmacy ${pharmacy_id}`);
      res.json({
        message: "Prescription envoyée à la pharmacie",
        prescription,
      });
    } catch (error) {
      console.error("❌ Erreur envoi pharmacie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les prescriptions pour la pharmacie connectée
  getPharmacyPrescriptions = async (req, res) => {
    try {
      console.log(`📥 Fetching inbox for pharmacy user ID: ${req.user.id}`);
      if (req.user.role !== "pharmacy" && req.user.role !== "admin") {
        console.log(`🚫 Unauthorized access: role ${req.user.role}`);
        return res.status(403).json({ error: "Accès réservé aux pharmaciens" });
      }

      const { status } = req.query;
      const prescriptions = await Prescription.getByPharmacy(req.user.id, status);
      
      // Hydrate with patient and doctor info
      const hydratedPrescriptions = await this._hydratePrescriptions(prescriptions);
      
      console.log(`✅ Found ${hydratedPrescriptions.length} prescriptions for pharmacy ${req.user.id}`);

      res.json({
        count: hydratedPrescriptions.length,
        prescriptions: hydratedPrescriptions,
      });
    } catch (error) {
      console.error("❌ Erreur récupération prescriptions pharmacie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Helper pour hydrater les noms des patients et médecins
  _hydratePrescriptions = async (prescriptions) => {
    if (!prescriptions || prescriptions.length === 0) return [];

    const patientIds = prescriptions.map(p => p.patient_id).filter(id => id);
    const doctorIds = prescriptions.map(p => p.doctor_id).filter(id => id);
    const allUserIds = [...new Set([...patientIds, ...doctorIds])];

    const usersMap = await UserService.getUsersBulk(allUserIds);

    return prescriptions.map(p => ({
      ...p,
      patient_first_name: usersMap[p.patient_id]?.first_name || 'Patient',
      patient_last_name: usersMap[p.patient_id]?.last_name || 'Inconnu',
      doctor_first_name: usersMap[p.doctor_id]?.first_name || 'Médecin',
      doctor_last_name: usersMap[p.doctor_id]?.last_name || 'Inconnu'
    }));
  }

  // Répondre (accepter/rejeter)
  async respondToPrescription(req, res) {
    try {
      if (req.user.role !== "pharmacy" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Accès réservé aux pharmaciens" });
      }

      const { id } = req.params;
      const { status, reason } = req.body;

      if (status !== 'accepted' && status !== 'rejected') {
        return res.status(400).json({ error: "Statut invalide (doit être accepted ou rejected)" });
      }

      const prescription = await Prescription.respondByPharmacy(id, status, reason);

      if (!prescription) {
        return res.status(404).json({ error: "Prescription non trouvée ou pas en attente" });
      }

      res.json({
        message: `Prescription ${status === 'accepted' ? 'acceptée' : 'rejetée'}`,
        prescription,
      });
    } catch (error) {
      console.error("❌ Erreur réponse pharmacie:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new PrescriptionController();
