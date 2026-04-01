const LabRequest = require('../models/LabRequest');
const LabTest = require('../models/LabTest');
const db = require('../config/database');
const { validationResult } = require('express-validator');
const moment = require('moment');

class LabRequestController {
  // Créer une demande d'analyse
  async createRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patient_id, doctor_id, appointment_id, tests, ...requestData } = req.body;

      // Créer la demande
      const request = await LabRequest.create({
        patient_id,
        doctor_id,
        appointment_id,
        ...requestData,
        requested_by: req.user.id
      });

      // Ajouter les tests
      if (tests && tests.length > 0) {
        const testDetails = await Promise.all(tests.map(async (test) => {
          if (test.test_id) {
            const labTest = await LabTest.findById(test.test_id);
            return {
              test_id: test.test_id,
              test_name: labTest.test_name,
              test_code: labTest.test_code,
              urgency: test.urgency,
              notes: test.notes
            };
          }
          return test;
        }));

        await LabRequest.addTests(request.id, testDetails);
      }

      // Récupérer la demande complète avec ses tests
      const completeRequest = {
        ...request,
        tests: await LabRequest.getTests(request.id)
      };

      res.status(201).json({
        message: 'Demande d\'analyse créée avec succès',
        request: completeRequest
      });
    } catch (error) {
      console.error('❌ Erreur création demande:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer une demande
  async getRequest(req, res) {
    try {
      const { id } = req.params;
      const request = await LabRequest.findById(id);

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

      const tests = await LabRequest.getTests(id);

      res.json({
        ...request,
        tests
      });
    } catch (error) {
      console.error('❌ Erreur récupération demande:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer mes demandes (patient)
  async getMyRequests(req, res) {
    try {
      const { status } = req.query;
      const requests = await LabRequest.getByPatient(req.user.id, status);

      res.json({
        count: requests.length,
        requests
      });
    } catch (error) {
      console.error('❌ Erreur récupération demandes:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Récupérer les demandes d'un médecin
  async getDoctorRequests(req, res) {
    try {
      const { doctorId } = req.params;
      const { status } = req.query;

      // Vérifier les permissions
      if (req.user.role !== 'admin' && req.user.id != doctorId) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      const requests = await LabRequest.getByDoctor(doctorId, status);

      res.json({
        count: requests.length,
        requests
      });
    } catch (error) {
      console.error('❌ Erreur récupération demandes médecin:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Mettre à jour le statut
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const request = await LabRequest.updateStatus(id, status);

      if (!request) {
        return res.status(404).json({ error: 'Demande non trouvée' });
      }

      res.json({
        message: 'Statut mis à jour',
        request
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour statut:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Mettre à jour le statut d'un test
  async updateTestStatus(req, res) {
    try {
      const { testId } = req.params;
      const { status, ...data } = req.body;

      const test = await LabRequest.updateTestStatus(testId, status, data);

      if (!test) {
        return res.status(404).json({ error: 'Test non trouvé' });
      }

      // Vérifier si tous les tests sont complétés
      await LabResult.checkAndUpdateRequestStatus(test.request_id);

      res.json({
        message: 'Statut du test mis à jour',
        test
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour test:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Statistiques
  async getStats(req, res) {
    try {
      const { doctorId, startDate, endDate } = req.query;

      const stats = await LabRequest.getStats(doctorId, startDate, endDate);

      // Ajouter les catégories populaires
      const categories = await db.query(`
        SELECT lt.category, COUNT(*) as request_count
        FROM request_tests rt
        JOIN lab_tests lt ON rt.test_id = lt.id
        JOIN lab_requests lr ON rt.request_id = lr.id
        WHERE ($1::int IS NULL OR lr.doctor_id = $1)
          AND ($2::date IS NULL OR lr.request_date >= $2)
          AND ($3::date IS NULL OR lr.request_date <= $3)
        GROUP BY lt.category
        ORDER BY request_count DESC
        LIMIT 5
      `, [doctorId || null, startDate || null, endDate || null]);

      res.json({
        ...stats,
        top_categories: categories.rows
      });
    } catch (error) {
      console.error('❌ Erreur récupération stats:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }

  // Demandes urgentes
  async getUrgentRequests(req, res) {
    try {
      const query = `
        SELECT lr.*, 
               u.first_name, u.last_name,
               COUNT(rt.id) as tests_count
        FROM lab_requests lr
        JOIN request_tests rt ON lr.id = rt.request_id
        JOIN auth.users u ON lr.patient_id = u.id
        WHERE rt.urgency = 'urgent' 
          AND rt.status != 'completed'
          AND lr.created_at > NOW() - INTERVAL '24 hours'
        GROUP BY lr.id, u.first_name, u.last_name
        ORDER BY lr.created_at
      `;
      
      const result = await db.query(query);
      
      res.json({
        count: result.rows.length,
        requests: result.rows
      });
    } catch (error) {
      console.error('❌ Erreur récupération demandes urgentes:', error);
      res.status(500).json({ error: 'Erreur interne' });
    }
  }
}

module.exports = new LabRequestController();