const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const allergyController = require('../controllers/allergyController');
const vitalSignsController = require('../controllers/vitalSignsController');
const vaccinationController = require('../controllers/vaccinationController');
const conditionController = require('../controllers/conditionController');
const aggregationController = require('../controllers/aggregationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { validateId, checkPatientAccess, validatePagination } = require('../middleware/validationMiddleware');
const {
  validatePatientId,
  validateAllergy,
  validateVitalSigns,
  validateVaccination,
  validateCondition,
  validateConsultationNote
} = require('../validators/medicalRecordValidators');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ==================== ROUTES PRINCIPALES ====================

// Récupérer le dossier complet d'un patient
router.get('/patient/:patientId',
  checkPatientAccess,
  validateId('patientId'),
  medicalRecordController.getFullRecord
);

// Récupérer le résumé médical d'un patient
router.get('/patient/:patientId/summary',
  checkPatientAccess,
  validateId('patientId'),
  medicalRecordController.getMedicalSummary
);

// Récupérer la chronologie des événements médicaux
router.get('/patient/:patientId/timeline',
  checkPatientAccess,
  validateId('patientId'),
  medicalRecordController.getTimeline
);

// Ajouter une note de consultation
router.post('/patient/:patientId/notes',
  authorize('doctor', 'admin'),
  checkPatientAccess,
  validateId('patientId'),
  validateConsultationNote,
  medicalRecordController.addConsultationNote
);

// ==================== ROUTES D'AGRÉGATION ====================

// Récupérer le dossier complet avec données externes
router.get('/patient/:patientId/complete',
  checkPatientAccess,
  validateId('patientId'),
  aggregationController.getCompletePatientRecord
);

// Récupérer uniquement les données externes
router.get('/patient/:patientId/external',
  checkPatientAccess,
  validateId('patientId'),
  aggregationController.getExternalData
);

// Récupérer les statistiques médicales
router.get('/patient/:patientId/stats',
  checkPatientAccess,
  validateId('patientId'),
  aggregationController.getMedicalStats
);

// Récupérer un résumé pour impression
router.get('/patient/:patientId/print-summary',
  checkPatientAccess,
  validateId('patientId'),
  aggregationController.getPrintSummary
);

// ==================== ROUTES ALLERGIES ====================

// Lister les allergies d'un patient
router.get('/patient/:patientId/allergies',
  checkPatientAccess,
  validateId('patientId'),
  allergyController.getPatientAllergies
);

// Ajouter une allergie
router.post('/patient/:patientId/allergies',
  authorize('doctor', 'admin'),
  checkPatientAccess,
  validateId('patientId'),
  validateAllergy,
  allergyController.createAllergy
);

// Récupérer une allergie spécifique
router.get('/allergies/:id',
  validateId('id'),
  allergyController.getAllergy
);

// Mettre à jour une allergie
router.put('/allergies/:id',
  authorize('doctor', 'admin'),
  validateId('id'),
  allergyController.updateAllergy
);

// Désactiver une allergie
router.patch('/allergies/:id/deactivate',
  authorize('doctor', 'admin'),
  validateId('id'),
  allergyController.deactivateAllergy
);

// Réactiver une allergie
router.patch('/allergies/:id/reactivate',
  authorize('doctor', 'admin'),
  validateId('id'),
  allergyController.reactivateAllergy
);

// Supprimer une allergie
router.delete('/allergies/:id',
  authorize('doctor', 'admin'),
  validateId('id'),
  allergyController.deleteAllergy
);

// Statistiques des allergies
router.get('/allergies/stats/common',
  authorize('admin'),
  allergyController.getCommonAllergies
);

// ==================== ROUTES CONSTANTES VITALES ====================

// Historique des constantes
router.get('/patient/:patientId/vitals',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getHistory
);

// Dernières constantes
router.get('/patient/:patientId/vitals/latest',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getLatest
);

// Ajouter des constantes
router.post('/patient/:patientId/vitals',
  authorize('doctor', 'nurse', 'admin'),
  checkPatientAccess,
  validateId('patientId'),
  validateVitalSigns,
  vitalSignsController.createVitalSigns
);

// Statistiques des constantes
router.get('/patient/:patientId/vitals/stats',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getStats
);

// Données pour graphiques
router.get('/patient/:patientId/vitals/chart/:type',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getChartData
);

// Tendances
router.get('/patient/:patientId/vitals/trends',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getTrends
);

// Alertes
router.get('/patient/:patientId/vitals/alerts',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.getAlerts
);

// Récupérer une constante spécifique
router.get('/vitals/:id',
  validateId('id'),
  vitalSignsController.getVitalSign
);

// Mettre à jour une constante
router.put('/vitals/:id',
  authorize('doctor', 'nurse', 'admin'),
  validateId('id'),
  vitalSignsController.updateVitalSign
);

// Supprimer une constante
router.delete('/vitals/:id',
  authorize('admin'),
  validateId('id'),
  vitalSignsController.deleteVitalSign
);

// Analyser des constantes
router.post('/vitals/analyze',
  authorize('doctor', 'admin'),
  vitalSignsController.analyzeVitals
);

// Comparer deux patients
router.get('/vitals/compare/:patientId1/:patientId2',
  authorize('doctor', 'admin'),
  validateId('patientId1'),
  validateId('patientId2'),
  vitalSignsController.comparePatients
);

// Export PDF
router.get('/vitals/export/:patientId/pdf',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.exportToPDF
);

// Export CSV
router.get('/vitals/export/:patientId/csv',
  checkPatientAccess,
  validateId('patientId'),
  vitalSignsController.exportToCSV
);

// ==================== ROUTES VACCINATIONS ====================

// Historique des vaccinations
router.get('/patient/:patientId/vaccinations',
  checkPatientAccess,
  validateId('patientId'),
  vaccinationController.getHistory
);

// Vaccinations à venir
router.get('/patient/:patientId/vaccinations/upcoming',
  checkPatientAccess,
  validateId('patientId'),
  vaccinationController.getUpcoming
);

// Ajouter une vaccination
router.post('/patient/:patientId/vaccinations',
  authorize('doctor', 'nurse', 'admin'),
  checkPatientAccess,
  validateId('patientId'),
  validateVaccination,
  vaccinationController.createVaccination
);

// Vérifier les vaccins dus
router.get('/patient/:patientId/vaccinations/check-due',
  checkPatientAccess,
  validateId('patientId'),
  vaccinationController.checkDue
);

// Résumé des vaccinations
router.get('/patient/:patientId/vaccinations/summary',
  checkPatientAccess,
  validateId('patientId'),
  vaccinationController.getSummary
);

// Récupérer une vaccination spécifique
router.get('/vaccinations/:id',
  validateId('id'),
  vaccinationController.getVaccination
);

// Mettre à jour une vaccination
router.put('/vaccinations/:id',
  authorize('doctor', 'nurse', 'admin'),
  validateId('id'),
  vaccinationController.updateVaccination
);

// Supprimer une vaccination
router.delete('/vaccinations/:id',
  authorize('admin'),
  validateId('id'),
  vaccinationController.deleteVaccination
);

// Envoyer un rappel
router.post('/vaccinations/:id/reminder',
  authorize('doctor', 'nurse', 'admin'),
  validateId('id'),
  vaccinationController.sendReminder
);

// Statistiques de couverture vaccinale
router.get('/vaccinations/stats/coverage',
  authorize('admin'),
  vaccinationController.getVaccinationCoverage
);

// Vaccinations à venir (global)
router.get('/vaccinations/stats/upcoming',
  authorize('admin'),
  vaccinationController.getUpcomingVaccinations
);

// Calendrier vaccinal par âge
router.get('/vaccinations/schedule/:age',
  vaccinationController.getVaccinationSchedule
);

// Recommandations personnalisées
router.post('/vaccinations/schedule/recommendations/:patientId',
  authorize('doctor', 'admin'),
  validateId('patientId'),
  vaccinationController.getRecommendations
);

// ==================== ROUTES ANTÉCÉDENTS ====================

// Lister les antécédents
router.get('/patient/:patientId/conditions',
  checkPatientAccess,
  validateId('patientId'),
  conditionController.getPatientConditions
);

// Ajouter un antécédent
router.post('/patient/:patientId/conditions',
  authorize('doctor', 'admin'),
  checkPatientAccess,
  validateId('patientId'),
  validateCondition,
  conditionController.createCondition
);

// Récupérer un antécédent spécifique
router.get('/conditions/:id',
  validateId('id'),
  conditionController.getCondition
);

// Mettre à jour un antécédent
router.put('/conditions/:id',
  authorize('doctor', 'admin'),
  validateId('id'),
  conditionController.updateCondition
);

// Marquer comme résolu
router.patch('/conditions/:id/resolve',
  authorize('doctor', 'admin'),
  validateId('id'),
  conditionController.resolveCondition
);

// Supprimer un antécédent
router.delete('/conditions/:id',
  authorize('admin'),
  validateId('id'),
  conditionController.deleteCondition
);

// ==================== ROUTES DE RECHERCHE ====================

// Recherche globale dans le dossier
router.get('/search',
  authorize('doctor', 'admin'),
  validatePagination,
  medicalRecordController.searchRecords
);

// Recherche par pathologie
router.get('/search/by-condition',
  authorize('doctor', 'admin'),
  medicalRecordController.searchByCondition
);

// Recherche par médicament
router.get('/search/by-medication',
  authorize('doctor', 'admin'),
  medicalRecordController.searchByMedication
);

// ==================== ROUTES D'EXPORT ====================

// Exporter le dossier complet en PDF
router.get('/export/:patientId/pdf',
  checkPatientAccess,
  validateId('patientId'),
  medicalRecordController.exportToPDF
);

// Exporter le résumé en PDF
router.get('/export/:patientId/summary-pdf',
  checkPatientAccess,
  validateId('patientId'),
  medicalRecordController.exportSummaryToPDF
);

// ==================== HEALTH CHECK ====================

// Health check spécifique au service (optionnel)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'medical-record-service',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;