const express = require("express");
const router = express.Router();
const prescriptionController = require("../controllers/prescriptionController");
const prescriptionItemController = require("../controllers/prescriptionItemController");
const validationController = require("../controllers/prescriptionValidationController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const {
  validatePrescription,
  validatePrescriptionId,
  validateRenewal,
  validateSearch,
  validateInteractions,
  validateDosage,
} = require("../validators/prescriptionValidators");

// Routes pour patients
router.get(
  "/my-prescriptions",
  authenticate,
  authorize("patient"),
  prescriptionController.getMyPrescriptions,
);

router.get(
  "/patient/:patientId",
  authenticate,
  authorize("patient", "doctor", "admin"),
  prescriptionController.getPatientPrescriptions,
);

// Health check proxy (prevents 'health' being treated as an ID)
router.get("/health", (req, res) =>
  res.json({ status: "healthy", service: "prescription-service" }),
);

// Routes pour médecins
router.post(
  "/",
  authenticate,
  authorize("doctor", "admin"),
  validatePrescription,
  prescriptionController.createPrescription,
);

router.get(
  "/doctor/:doctorId",
  authenticate,
  authorize("doctor", "admin"),
  prescriptionController.getDoctorPrescriptions,
);

router.put(
  "/:id/renew",
  authenticate,
  authorize("doctor", "admin"),
  validatePrescriptionId,
  validateRenewal,
  prescriptionController.renewPrescription,
);

// Routes pour pharmaciens
router.get(
  "/:id/availability",
  authenticate,
  authorize("pharmacy", "admin"),
  validatePrescriptionId,
  prescriptionController.checkAvailability,
);

router.get(
  "/pharmacy/inbox",
  authenticate,
  authorize("pharmacy", "admin"),
  prescriptionController.getPharmacyPrescriptions,
);

router.patch(
  "/:id/respond-to-pharmacy",
  authenticate,
  authorize("pharmacy", "admin"),
  validatePrescriptionId,
  prescriptionController.respondToPrescription,
);

// Routes pour validation
router.post(
  "/validate/interactions",
  authenticate,
  authorize("doctor", "pharmacy", "admin"),
  validateInteractions,
  validationController.checkInteractions,
);

router.post(
  "/validate/dosage",
  authenticate,
  authorize("doctor", "pharmacy", "admin"),
  validateDosage,
  validationController.validateDosage,
);

router.get(
  "/:id/validate",
  authenticate,
  authorize("doctor", "pharmacy", "admin"),
  validatePrescriptionId,
  validationController.validateFullPrescription,
);

router.put(
  "/:id/validate",
  authenticate,
  authorize("doctor", "admin"),
  validatePrescriptionId,
  prescriptionController.validatePrescription,
);

// Routes pour items
router.put(
  "/items/:id",
  authenticate,
  authorize("doctor", "admin"),
  prescriptionItemController.updateItem,
);

router.delete(
  "/items/:id",
  authenticate,
  authorize("doctor", "admin"),
  prescriptionItemController.deleteItem,
);

router.get(
  "/:prescriptionId/summary",
  authenticate,
  prescriptionItemController.getPrescriptionSummary,
);

// Routes générales
router.get(
  "/search",
  authenticate,
  authorize("doctor", "pharmacy", "admin"),
  validateSearch,
  prescriptionController.searchPrescriptions,
);

router.get(
  "/stats",
  authenticate,
  authorize("admin", "doctor"),
  prescriptionController.getStats,
);

router.get(
  "/:id/pdf",
  authenticate,
  validatePrescriptionId,
  prescriptionController.generatePDF,
);

router.patch(
  "/:id/send-to-pharmacy",
  authenticate,
  authorize("patient", "admin"),
  validatePrescriptionId,
  prescriptionController.sendToPharmacy,
);

router.get(
  "/:id",
  authenticate,
  validatePrescriptionId,
  prescriptionController.getPrescription,
);

router.put(
  "/:id/cancel",
  authenticate,
  authorize("doctor", "admin"),
  validatePrescriptionId,
  prescriptionController.cancelPrescription,
);

module.exports = router;
