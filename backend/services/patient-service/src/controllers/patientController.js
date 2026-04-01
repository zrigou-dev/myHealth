const Patient = require('../models/Patient');
const { validationResult } = require('express-validator');
const axios = require('axios');

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

      // Enrich with auth data
      let userData = {};
      try {
        const authRes = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/users/${patient.user_id}`);
        userData = authRes.data || {};
      } catch (authErr) {
        console.error('Error fetching user data from auth-service:', authErr.message);
      }

      res.json({
        ...patient,
        first_name: userData.first_name || userData.firstName || 'Patient',
        last_name: userData.last_name || userData.lastName || String(patient.user_id),
        email: userData.email || '',
        phone: userData.phone || '',
        user: {
          id: userData.id || req.user.id,
          email: userData.email || req.user.email,
          firstName: userData.first_name || userData.firstName || req.user.firstName,
          lastName: userData.last_name || userData.lastName || req.user.lastName,
          role: userData.role || req.user.role
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
        console.error('Validation errors:', JSON.stringify(errors.array(), null, 2));
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
      
      if (patients.length === 0) {
        return res.json([]);
      }

      // Fetch user data in bulk
      const userIdList = [...new Set(patients.map(p => p.user_id))];
      let userMap = {};
      
      try {
        const authRes = await axios.post(`${process.env.AUTH_SERVICE_URL}/api/auth/users/bulk`, {
          ids: userIdList
        });
        const users = authRes.data || [];
        users.forEach(u => {
          userMap[u.id] = u;
        });
      } catch (authErr) {
        console.error('Error fetching bulk users from auth-service:', authErr.message);
      }

      // Merge data
      const enrichedPatients = patients.map(p => {
        const user = userMap[p.user_id] || {};
        return {
          ...p,
          first_name: user.first_name || user.firstName || 'Patient',
          last_name: user.last_name || user.lastName || String(p.user_id),
          email: user.email || '',
          phone: user.phone || ''
        };
      });

      res.json(enrichedPatients);
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

  // Récupérer un patient par User ID
  async getPatientByUserId(req, res) {
    try {
      const patient = await Patient.findByUserId(req.params.userId);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Permissions check
      const isOwner = req.user.id === parseInt(req.params.userId);
      const isStaff = ['admin', 'doctor'].includes(req.user.role);

      if (!isOwner && !isStaff) {
        return res.status(403).json({ error: 'Unauthorized profile access' });
      }

      // Fetch user data
      let userData = {};
      try {
        const authRes = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/users/${patient.user_id}`);
        userData = authRes.data || {};
      } catch (authErr) {
        console.error('Error fetching user data from auth-service:', authErr.message);
      }

      res.json({
        ...patient,
        first_name: userData.first_name || userData.firstName || 'Patient',
        last_name: userData.last_name || userData.lastName || String(patient.user_id),
        email: userData.email || '',
        phone: userData.phone || ''
      });
    } catch (error) {
      console.error('Get patient by user id error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Récupérer un patient par ID
  async getPatientById(req, res) {
    try {
      const patient = await Patient.findById(req.params.id);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Vérifier les permissions : Admin, Docteur, ou le Patient lui-même
      const isOwner = req.user.id === patient.user_id;
      const isStaff = ['admin', 'doctor'].includes(req.user.role);

      if (!isOwner && !isStaff) {
        return res.status(403).json({ error: 'Unauthorized profile access' });
      }

      // Fetch user data
      let userData = {};
      try {
        const authRes = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/users/${patient.user_id}`);
        userData = authRes.data || {};
      } catch (authErr) {
        console.error('Error fetching user data from auth-service:', authErr.message);
      }

      res.json({
        ...patient,
        first_name: userData.first_name || userData.firstName || 'Patient',
        last_name: userData.last_name || userData.lastName || String(patient.user_id),
        email: userData.email || '',
        phone: userData.phone || ''
      });
    } catch (error) {
      console.error('Get patient by id error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new PatientController();