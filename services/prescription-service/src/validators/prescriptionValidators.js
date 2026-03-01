const { body, param, query, validationResult } = require("express-validator");
const moment = require("moment");

// Validateur pour création de prescription
const validatePrescription = [
  body("patient_id").isInt({ min: 1 }).withMessage("ID patient invalide"),

  body("doctor_id").isInt({ min: 1 }).withMessage("ID médecin invalide"),

  body("pharmacy_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID pharmacie invalide"),

  body("expiry_date")
    .optional()
    .isISO8601()
    .withMessage("Date d'expiration invalide")
    .custom((date) => {
      if (moment(date).isBefore(moment().startOf("day"))) {
        throw new Error("La date d'expiration doit être dans le futur");
      }
      return true;
    }),

  body("start_date")
    .optional()
    .isISO8601()
    .withMessage("Date de début invalide"),

  body("diagnosis")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Diagnostic trop long"),

  body("clinical_notes")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Notes cliniques trop longues"),

  body("patient_instructions")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Instructions trop longues"),

  body("renewals_allowed")
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage("Nombre de renouvellements invalide"),

  body("priority")
    .optional()
    .isIn(["routine", "urgent", "stat"])
    .withMessage("Priorité invalide"),

  body("has_controlled_substance")
    .optional()
    .isBoolean()
    .withMessage("Champ booléen requis"),

  body("controlled_substance_id")
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage("ID substance contrôlée invalide"),

  body("items")
    .isArray({ min: 1 })
    .withMessage("Au moins un médicament est requis"),

  body("items.*.medication_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID médicament invalide"),

  body("items.*.medication_code").optional().isString().isLength({ max: 50 }),

  body("items.*.medication_name")
    .notEmpty()
    .withMessage("Nom du médicament requis")
    .isLength({ max: 200 }),

  body("items.*.dosage_value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Dosage invalide"),

  body("items.*.dosage_unit").optional().isString().isLength({ max: 20 }),

  body("items.*.dosage_form").optional().isString().isLength({ max: 50 }),

  body("items.*.strength").optional().isString().isLength({ max: 50 }),

  body("items.*.frequency_value")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Fréquence invalide"),

  body("items.*.frequency_unit")
    .optional()
    .isIn(["hour", "day", "week", "month"])
    .withMessage("Unité de fréquence invalide"),

  body("items.*.frequency_detail").optional().isString().isLength({ max: 200 }),

  body("items.*.duration_value")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Durée invalide"),

  body("items.*.duration_unit")
    .optional()
    .isIn(["day", "week", "month"])
    .withMessage("Unité de durée invalide"),

  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantité invalide"),

  body("items.*.quantity_unit").optional().isString().isLength({ max: 20 }),

  body("items.*.instructions").optional().isString().isLength({ max: 500 }),

  body("items.*.indications").optional().isString().isLength({ max: 500 }),

  body("items.*.substitution_allowed")
    .optional()
    .isBoolean()
    .withMessage("Champ booléen requis"),

  body("items.*.unit_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Prix unitaire invalide"),
];

// Validateur pour ID prescription
const validatePrescriptionId = [
  param("id").isInt({ min: 1 }).withMessage("ID prescription invalide"),
  // renvoyer l'erreur dès que possible
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Validateur pour renouvellement
const validateRenewal = [
  param("id").isInt({ min: 1 }).withMessage("ID prescription invalide"),

  body("reason")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Raison trop longue"),

  body("new_expiry_date")
    .optional()
    .isISO8601()
    .withMessage("Date d'expiration invalide")
    .custom((date) => {
      if (moment(date).isBefore(moment().add(1, "day"))) {
        throw new Error(
          "La nouvelle date d'expiration doit être dans le futur",
        );
      }
      return true;
    }),
];

// Validateur pour recherche
const validateSearch = [
  query("patientName")
    .optional()
    .isString()
    .isLength({ min: 2 })
    .withMessage("Nom patient trop court (minimum 2 caractères)"),

  query("doctorName")
    .optional()
    .isString()
    .isLength({ min: 2 })
    .withMessage("Nom médecin trop court"),

  query("prescriptionNumber").optional().isString(),

  query("status")
    .optional()
    .isIn([
      "active",
      "dispensed",
      "partially_dispensed",
      "expired",
      "cancelled",
      "renewed",
    ])
    .withMessage("Statut invalide"),

  query("fromDate")
    .optional()
    .isISO8601()
    .withMessage("Date de début invalide"),

  query("toDate")
    .optional()
    .isISO8601()
    .withMessage("Date de fin invalide")
    .custom((toDate, { req }) => {
      if (req.query.fromDate && moment(toDate).isBefore(req.query.fromDate)) {
        throw new Error("La date de fin doit être après la date de début");
      }
      return true;
    }),

  query("medicationId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID médicament invalide"),

  query("hasControlledSubstance")
    .optional()
    .isBoolean()
    .withMessage("Valeur booléenne requise"),

  query("page").optional().isInt({ min: 1 }).withMessage("Page invalide"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit doit être entre 1 et 100"),
];

// Validateur pour mise à jour d'item
const validateItemUpdate = [
  param("id").isInt({ min: 1 }).withMessage("ID item invalide"),

  body("dosage_value")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Dosage invalide"),

  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantité invalide")
    .custom((quantity, { req }) => {
      // Vérifier que la nouvelle quantité n'est pas inférieure à la quantité déjà délivrée
      // Cette vérification nécessite de charger l'item, donc à faire dans le contrôleur
      return true;
    }),

  body("instructions")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Instructions trop longues"),

  body("indications")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Indications trop longues"),

  body("substitution_allowed")
    .optional()
    .isBoolean()
    .withMessage("Champ booléen requis"),
];

// Validateur pour validation de prescription
const validatePrescriptionValidation = [
  param("id").isInt({ min: 1 }).withMessage("ID prescription invalide"),

  body("notes")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Notes trop longues"),

  body("is_approved")
    .optional()
    .isBoolean()
    .withMessage("Champ booléen requis"),
];

// Validateur pour interactions
const validateInteractions = [
  body("medicationIds")
    .isArray({ min: 2 })
    .withMessage("Au moins 2 IDs de médicaments requis")
    .custom((ids) => {
      if (!ids.every((id) => Number.isInteger(id) && id > 0)) {
        throw new Error("Tous les IDs doivent être des entiers positifs");
      }
      return true;
    }),
];

// Validateur pour dosage
const validateDosage = [
  body("medication_id").isInt({ min: 1 }).withMessage("ID médicament invalide"),

  body("dosage_value").isFloat({ min: 0 }).withMessage("Dosage invalide"),

  body("dosage_unit")
    .isString()
    .notEmpty()
    .withMessage("Unité de dosage requise"),

  body("frequency_value").isInt({ min: 1 }).withMessage("Fréquence invalide"),

  body("frequency_unit")
    .isIn(["hour", "day", "week", "month"])
    .withMessage("Unité de fréquence invalide"),

  body("patient_age")
    .optional()
    .isInt({ min: 0, max: 130 })
    .withMessage("Âge patient invalide"),

  body("patient_weight")
    .optional()
    .isFloat({ min: 0, max: 300 })
    .withMessage("Poids patient invalide"),
];

// Validateur pour template
const validateTemplate = [
  body("template_name")
    .notEmpty()
    .withMessage("Nom du template requis")
    .isLength({ max: 100 }),

  body("template_code").optional().isString().isLength({ max: 50 }),

  body("is_public").optional().isBoolean(),

  body("template_data")
    .notEmpty()
    .withMessage("Données du template requises")
    .isJSON()
    .withMessage("Format JSON invalide"),
];

module.exports = {
  validatePrescription,
  validatePrescriptionId,
  validateRenewal,
  validateSearch,
  validateItemUpdate,
  validatePrescriptionValidation,
  validateInteractions,
  validateDosage,
  validateTemplate,
};
