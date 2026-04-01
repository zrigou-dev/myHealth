const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const AppointmentService = require("../services/appointmentService");
const DoctorService = require("../services/doctorService");
const PatientService = require("../services/patientService");
const { validationResult } = require("express-validator");
const moment = require("moment");

class InvoiceController {
  // Créer une facture
  async createInvoice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const invoiceData = {
        ...req.body,
        created_by: req.user.id,
      };

      const invoice = await Invoice.create(invoiceData);

      res.status(201).json({
        message: "Facture créée avec succès",
        invoice,
      });
    } catch (error) {
      console.error("❌ Erreur création facture:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Créer une facture depuis un rendez-vous
  async createFromAppointment(req, res) {
    try {
      const { appointmentId } = req.params;

      // Récupérer les infos du rendez-vous
      const appointment = await AppointmentService.getAppointment(
        appointmentId,
        req.headers.authorization,
      );
      if (!appointment) {
        return res.status(404).json({ error: "Rendez-vous non trouvé" });
      }

      // Récupérer les infos du médecin
      const doctor = await DoctorService.getDoctor(appointment.doctor_id);
      if (!doctor) {
        return res.status(404).json({ error: "Médecin non trouvé" });
      }

      // Récupérer les infos du patient (optionnel)
      const patient = await PatientService.getPatient(
        appointment.patient_id,
        req.headers.authorization,
      );

      // Créer la facture
      const invoice = await Invoice.createFromAppointment(
        appointment,
        doctor,
        patient,
      );

      res.status(201).json({
        message: "Facture créée à partir du rendez-vous",
        invoice,
      });
    } catch (error) {
      console.error("❌ Erreur création facture depuis rendez-vous:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer mes factures (patient)
  async getMyInvoices(req, res) {
    try {
      const { status } = req.query;
      const invoices = await Invoice.getByPatient(req.user.id, status);

      res.json({
        count: invoices.length,
        invoices,
      });
    } catch (error) {
      console.error("❌ Erreur récupération factures:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer les factures pour un médecin (utilisé par le médecin/admin)
  async getByDoctor(req, res) {
    try {
      const { doctorId } = req.params;
      const { status } = req.query;

      // autorisation supplémentaire : un médecin ne peut voir que ses propres factures à moins d'être admin
      if (req.user.role !== "admin" && req.user.id !== doctorId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      const invoices = await Invoice.getByDoctor(doctorId, status);
      res.json({
        count: invoices.length,
        invoices,
      });
    } catch (error) {
      console.error("❌ Erreur récupération factures médecin:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Récupérer une facture spécifique
  async getInvoice(req, res) {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id);

      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }

      // Vérifier les permissions
      if (
        invoice.patient_id !== req.user.id &&
        invoice.doctor_id !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      // Récupérer les paiements associés
      const payments = await Payment.getByInvoice(id);

      res.json({
        ...invoice,
        payments,
      });
    } catch (error) {
      console.error("❌ Erreur récupération facture:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Télécharger le PDF
  async downloadPdf(req, res) {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id);

      if (!invoice) {
        return res.status(404).json({ error: "Facture non trouvée" });
      }

      // Générer le PDF
      const pdfBuffer = await Invoice.generatePdf(id);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=facture-${invoice.invoice_number}.pdf`,
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("❌ Erreur génération PDF:", error);
      res.status(500).json({ error: "Erreur génération PDF" });
    }
  }

  // Marquer comme envoyée
  async markAsSent(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.markAsSent(id);

      if (!invoice) {
        return res
          .status(404)
          .json({ error: "Facture non trouvée ou déjà envoyée" });
      }

      res.json({
        message: "Facture marquée comme envoyée",
        invoice,
      });
    } catch (error) {
      console.error("❌ Erreur marquage facture:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Statistiques
  async getStats(req, res) {
    try {
      const { doctorId, startDate, endDate } = req.query;

      // Vérifier les permissions
      if (doctorId && req.user.role !== "admin" && req.user.id != doctorId) {
        return res.status(403).json({ error: "Accès non autorisé" });
      }

      const stats = await Invoice.getStats(
        doctorId === "me" ? req.user.id : doctorId,
        startDate,
        endDate,
      );

      res.json(stats);
    } catch (error) {
      console.error("❌ Erreur récupération statistiques:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }

  // Factures en retard (admin only)
  async getOverdueInvoices(req, res) {
    try {
      const result = await db.query(`
        SELECT i.*, 
               u.first_name, u.last_name, u.email
        FROM invoices i
        JOIN auth.users u ON i.patient_id = u.id
        WHERE i.status IN ('sent', 'partially_paid')
          AND i.due_date < CURRENT_DATE
        ORDER BY i.due_date
      `);

      res.json({
        count: result.rows.length,
        invoices: result.rows,
        total_overdue: result.rows.reduce(
          (sum, inv) => sum + parseFloat(inv.amount_due),
          0,
        ),
      });
    } catch (error) {
      console.error("❌ Erreur récupération factures en retard:", error);
      res.status(500).json({ error: "Erreur interne" });
    }
  }
}

module.exports = new InvoiceController();
