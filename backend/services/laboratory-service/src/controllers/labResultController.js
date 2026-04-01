const LabResult = require('../models/LabResult');
const LabRequest = require('../models/LabRequest');
const db = require('../config/database');
const { validationResult } = require('express-validator');
const PDFGenerator = require('../utils/pdfGenerator');
const PatientService = require('../services/patientService');
const DoctorService = require('../services/doctorService');

class LabResultController {
  // Ajouter un résultat
  async addResult(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        request_id, request_test_id, test_id,
        result_value, result_text, unit, performed_by
      } = req.body;

      console.log('📝 Ajout résultat pour test:', request_test_id);

      // Récupérer la demande pour obtenir le patient_id
      const request = await LabRequest.findById(request_id);
      if (!request) {
        return res.status(404).json({ error: 'Demande non trouvée' });
      }

      // Vérifier que le test existe dans la demande
      const tests = await LabRequest.getTests(request_id);
      const testExists = tests.some(t => t.id == request_test_id);
      if (!testExists) {
        return res.status(404).json({ error: 'Test non trouvé dans cette demande' });
      }

      const result = await LabResult.create({
        request_id,
        request_test_id,
        test_id,
        patient_id: request.patient_id,
        result_value,
        result_text,
        unit,
        performed_by: performed_by || req.user.id
      });

      res.status(201).json({
        message: 'Résultat ajouté avec succès',
        result
      });
    } catch (error) {
      console.error('❌ Erreur ajout résultat:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Ajouter plusieurs résultats (pour saisie groupée)
  async addBulkResults(req, res) {
    try {
      const { request_id, results } = req.body;

      if (!request_id || !results || !Array.isArray(results)) {
        return res.status(400).json({ error: 'Données invalides' });
      }

      // Récupérer la demande
      const request = await LabRequest.findById(request_id);
      if (!request) {
        return res.status(404).json({ error: 'Demande non trouvée' });
      }

      const addedResults = [];
      const errors = [];

      for (const item of results) {
        try {
          const { request_test_id, test_id, result_value, result_text, unit } = item;
          
          // Vérifier que le test existe
          const tests = await LabRequest.getTests(request_id);
          const testExists = tests.some(t => t.id == request_test_id);
          
          if (!testExists) {
            errors.push({ request_test_id, error: 'Test non trouvé' });
            continue;
          }

          const result = await LabResult.create({
            request_id,
            request_test_id,
            test_id,
            patient_id: request.patient_id,
            result_value,
            result_text,
            unit,
            performed_by: req.user.id
          });

          addedResults.push(result);
        } catch (err) {
          errors.push({ item, error: err.message });
        }
      }

      res.status(201).json({
        message: `${addedResults.length} résultats ajoutés`,
        added: addedResults,
        errors: errors.length ? errors : undefined
      });
    } catch (error) {
      console.error('❌ Erreur ajout résultats groupés:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Valider un résultat
  async validateResult(req, res) {
    try {
      const { id } = req.params;
      
      console.log('🔍 Validation résultat ID:', id);
      
      const result = await LabResult.validate(id, req.user.id);

      if (!result) {
        return res.status(404).json({ error: 'Résultat non trouvé' });
      }

      res.json({
        message: 'Résultat validé avec succès',
        result
      });
    } catch (error) {
      console.error('❌ Erreur validation résultat:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer les résultats d'une demande
  async getResults(req, res) {
    try {
      const { requestId } = req.params;
      
      console.log('🔍 Récupération résultats pour demande:', requestId);
      
      const request = await LabRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({ error: 'Demande non trouvée' });
      }

      // Vérifier les permissions
      if (request.patient_id !== req.user.id && 
          request.doctor_id !== req.user.id && 
          req.user.role !== 'admin' &&
          req.user.role !== 'lab_technician') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const results = await LabResult.getByRequest(requestId);
      const tests = await LabRequest.getTests(requestId);

      // Enrichir les résultats avec les infos des tests
      const enrichedResults = results.map(result => {
        const test = tests.find(t => t.test_id === result.test_id);
        return {
          ...result,
          test_name: test?.test_name,
          test_code: test?.test_code,
          reference_ranges: test?.reference_ranges
        };
      });

      res.json({
        request_id: requestId,
        request_number: request.request_number,
        patient_id: request.patient_id,
        doctor_id: request.doctor_id,
        results: enrichedResults,
        tests: tests
      });
    } catch (error) {
      console.error('❌ Erreur récupération résultats:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer un résultat spécifique
  async getResult(req, res) {
    try {
      const { id } = req.params;
      
      const result = await db.query(`
        SELECT lr.*, lt.test_name, lt.test_code, lt.reference_ranges,
               lrq.request_number, lrq.patient_id, lrq.doctor_id
        FROM lab_results lr
        JOIN lab_tests lt ON lr.test_id = lt.id
        JOIN lab_requests lrq ON lr.request_id = lrq.id
        WHERE lr.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Résultat non trouvé' });
      }

      // Vérifier les permissions
      const row = result.rows[0];
      if (row.patient_id !== req.user.id && 
          row.doctor_id !== req.user.id && 
          req.user.role !== 'admin' &&
          req.user.role !== 'lab_technician') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('❌ Erreur récupération résultat:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer mes résultats (patient)
  async getMyResults(req, res) {
    try {
      const { limit, days } = req.query;
      
      let query = `
        SELECT lr.*, lt.test_name, lt.test_code, lt.reference_ranges,
               lrq.request_number, lrq.request_date
        FROM lab_results lr
        JOIN lab_tests lt ON lr.test_id = lt.id
        JOIN lab_requests lrq ON lr.request_id = lrq.id
        WHERE lr.patient_id = $1
      `;
      const values = [req.user.id];

      if (days) {
        query += ` AND lr.performed_at > NOW() - INTERVAL '${days} days'`;
      }

      query += ` ORDER BY lr.performed_at DESC`;
      
      if (limit) {
        query += ` LIMIT $2`;
        values.push(parseInt(limit));
      }

      const result = await db.query(query, values);

      // Grouper par demande
      const grouped = result.rows.reduce((acc, row) => {
        if (!acc[row.request_id]) {
          acc[row.request_id] = {
            request_id: row.request_id,
            request_number: row.request_number,
            request_date: row.request_date,
            results: []
          };
        }
        acc[row.request_id].results.push(row);
        return acc;
      }, {});

      res.json({
        count: result.rows.length,
        grouped: Object.values(grouped)
      });
    } catch (error) {
      console.error('❌ Erreur récupération mes résultats:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer les résultats d'un patient (pour agrégation)
  async getPatientResults(req, res) {
    try {
      const { patientId } = req.params;
      
      const query = `
        SELECT lr.*, lt.test_name, lt.test_code, lt.reference_ranges,
               lrq.request_number, lrq.request_date
        FROM lab_results lr
        JOIN lab_tests lt ON lr.test_id = lt.id
        JOIN lab_requests lrq ON lr.request_id = lrq.id
        WHERE lr.patient_id = $1
        ORDER BY lr.performed_at DESC
      `;
      
      const result = await db.query(query, [patientId]);
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Erreur récupération résultats patient:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Générer un rapport PDF
  async generateReport(req, res) {
    try {
      const { requestId } = req.params;
      
      console.log('📄 Génération PDF pour demande:', requestId);
      
      const request = await LabRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({ error: 'Demande non trouvée' });
      }

      // Vérifier les permissions
      if (request.patient_id !== req.user.id && 
          request.doctor_id !== req.user.id && 
          req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const results = await LabResult.getByRequest(requestId);
      const tests = await LabRequest.getTests(requestId);

      // Récupérer les infos patient et médecin
      const patient = await PatientService.getPatient(request.patient_id, req.headers.authorization);
      const doctor = await DoctorService.getDoctor(request.doctor_id);

      const pdfBuffer = await PDFGenerator.generateLabReport({
        request,
        results,
        tests,
        patient,
        doctor
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=resultats-${request.request_number}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      res.status(500).json({ error: 'Erreur génération PDF' });
    }
  }

  // Obtenir les statistiques des résultats
  async getResultStats(req, res) {
    try {
      const { testId, startDate, endDate, doctorId } = req.query;

      let query = `
        SELECT 
          lt.id as test_id,
          lt.test_name,
          lt.test_code,
          COUNT(lr.id) as total_results,
          AVG(lr.result_value) as average_value,
          MIN(lr.result_value) as min_value,
          MAX(lr.result_value) as max_value,
          COUNT(CASE WHEN lr.is_abnormal THEN 1 END) as abnormal_count,
          COUNT(CASE WHEN lr.flag = 'critical_high' THEN 1 END) as critical_high,
          COUNT(CASE WHEN lr.flag = 'critical_low' THEN 1 END) as critical_low,
          COUNT(CASE WHEN lr.flag = 'high' THEN 1 END) as high_count,
          COUNT(CASE WHEN lr.flag = 'low' THEN 1 END) as low_count
        FROM lab_results lr
        JOIN lab_tests lt ON lr.test_id = lt.id
        JOIN lab_requests lrq ON lr.request_id = lrq.id
        WHERE 1=1
      `;
      const values = [];

      if (testId) {
        query += ` AND lr.test_id = $${values.length + 1}`;
        values.push(testId);
      }

      if (doctorId) {
        query += ` AND lrq.doctor_id = $${values.length + 1}`;
        values.push(doctorId);
      }

      if (startDate) {
        query += ` AND lr.performed_at >= $${values.length + 1}`;
        values.push(startDate);
      }

      if (endDate) {
        query += ` AND lr.performed_at <= $${values.length + 1}`;
        values.push(endDate);
      }

      query += ` GROUP BY lt.id, lt.test_name, lt.test_code`;

      const result = await db.query(query, values);
      
      res.json({
        count: result.rows.length,
        stats: result.rows
      });
    } catch (error) {
      console.error('❌ Erreur récupération stats résultats:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Marquer un résultat comme imprimé
  async markAsPrinted(req, res) {
    try {
      const { id } = req.params;
      
      await db.query(
        'UPDATE lab_results SET printed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      res.json({ message: 'Résultat marqué comme imprimé' });
    } catch (error) {
      console.error('❌ Erreur marquage impression:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Ajouter un commentaire à un résultat
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { comment } = req.body;

      await db.query(
        'UPDATE lab_results SET comments = $2 WHERE id = $1',
        [id, comment]
      );

      res.json({ message: 'Commentaire ajouté' });
    } catch (error) {
      console.error('❌ Erreur ajout commentaire:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Obtenir l'historique des résultats d'un patient pour un test spécifique
  async getPatientTestHistory(req, res) {
    try {
      const { patientId, testId } = req.params;
      const { limit = 10 } = req.query;

      // Vérifier les permissions
      if (patientId != req.user.id && req.user.role !== 'admin' && req.user.role !== 'doctor') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const result = await db.query(`
        SELECT lr.*, lrq.request_date
        FROM lab_results lr
        JOIN lab_requests lrq ON lr.request_id = lrq.id
        WHERE lr.patient_id = $1 AND lr.test_id = $2
        ORDER BY lr.performed_at DESC
        LIMIT $3
      `, [patientId, testId, limit]);

      res.json({
        test_id: testId,
        patient_id: patientId,
        count: result.rows.length,
        history: result.rows
      });
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new LabResultController();