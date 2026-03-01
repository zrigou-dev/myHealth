const Patient = require('../models/Patient');
const { validationResult } = require('express-validator');

class PatientController {
  // Créer un dossier patient
  async createPatient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Vérifier si le patient existe déjà
      const existingPatient = await Patient.findByUserId(req.user.id);
      if (existingPatient) {
        return res.status(409).json({ 
          error: 'Patient record already exists for this user' 
        });
      }

      const patientData = {
        user_id: req.user.id,
        ...req.body
      };

      const patient = await Patient.create(patientData);

      res.status(201).json({
        message: 'Patient record created successfully',
        patient
      });
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Récupérer le profil patient
  async getPatientProfile(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.id);
      
      if (!patient) {
        return res.status(404).json({ 
          error: 'Patient record not found' 
        });
      }

      res.json({
        ...patient,
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role
        }
      });
    } catch (error) {
      console.error('Get patient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Mettre à jour le profil patient
  async updatePatient(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const patient = await Patient.update(req.user.id, req.body);
      
      if (!patient) {
        return res.status(404).json({ 
          error: 'Patient record not found' 
        });
      }

      res.json({
        message: 'Patient record updated successfully',
        patient
      });
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Ajouter une note
  async addNote(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.id);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const note = await Patient.addNote(patient.id, {
        ...req.body,
        created_by: req.user.id
      });

      res.status(201).json({
        message: 'Note added successfully',
        note
      });
    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Récupérer les notes
  async getNotes(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.id);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const notes = await Patient.getNotes(patient.id);
      res.json(notes);
    } catch (error) {
      console.error('Get notes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Ajouter un contact d'urgence
  async addEmergencyContact(req, res) {
    try {
      const patient = await Patient.findByUserId(req.user.id);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const contact = await Patient.addEmergencyContact(patient.id, req.body);

      res.status(201).json({
        message: 'Emergency contact added successfully',
        contact
      });
    } catch (error) {
      console.error('Add emergency contact error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Rechercher des patients (admin/doctor only)
  async searchPatients(req, res) {
    try {
      const patients = await Patient.search(req.query);
      res.json(patients);
    } catch (error) {
      console.error('Search patients error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Obtenir les statistiques (admin only)
  async getStats(req, res) {
    try {
      const stats = await Patient.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Récupérer un patient par ID (admin/doctor only)
  async getPatientById(req, res) {
    try {
      const patient = await Patient.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      res.json(patient);
    } catch (error) {
      console.error('Get patient by id error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new PatientController();