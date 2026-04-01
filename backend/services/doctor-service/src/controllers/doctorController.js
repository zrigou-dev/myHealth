const Doctor = require('../models/Doctor');
const { validationResult } = require('express-validator');
const axios = require('axios');
const db = require('../config/database');  // 👈 IMPORTANT: Ajout de db

class DoctorController {
  // Créer un profil médecin
  async createDoctorProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Vérifier si le médecin existe déjà
      const existingDoctor = await Doctor.findByUserId(req.user.id);
      if (existingDoctor) {
        return res.status(409).json({ 
          error: 'Doctor profile already exists for this user' 
        });
      }

      // Vérifier que l'utilisateur a le rôle 'doctor'
      if (req.user.role !== 'doctor') {
        return res.status(403).json({ 
          error: 'Only users with doctor role can create a doctor profile' 
        });
      }

      const doctorData = {
        user_id: req.user.id,
        ...req.body
      };

      const doctor = await Doctor.create(doctorData);

      res.status(201).json({
        message: 'Doctor profile created successfully',
        doctor
      });
    } catch (error) {
      console.error('Create doctor error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Récupérer le profil du médecin connecté
  async getMyProfile(req, res) {
    try {
      console.log('📝 Récupération profil pour user:', req.user.id);
      
      const doctor = await Doctor.findByUserId(req.user.id);
      
      if (!doctor) {
        console.log('❌ Profil médecin non trouvé pour user:', req.user.id);
        return res.status(404).json({ 
          error: 'Doctor profile not found. Please create your profile first.' 
        });
      }

      console.log('✅ Profil médecin trouvé:', doctor.id);

      // Ajouter les statistiques
      let stats = {};
      try {
        stats = await Doctor.getStats(doctor.id);
      } catch (statsError) {
        console.error('Erreur récupération stats:', statsError);
        stats = {
          total_patients: 0,
          total_consultations: 0,
          average_rating: null,
          total_reviews: 0,
          upcoming_leaves: 0
        };
      }

      // Structure de la réponse
      const response = {
        id: doctor.id,
        user_id: doctor.user_id,
        license_number: doctor.license_number,
        specialization: doctor.specialization,
        sub_specializations: doctor.sub_specializations || [],
        years_experience: doctor.years_experience,
        education: doctor.education || [],
        certifications: doctor.certifications || [],
        languages_spoken: doctor.languages_spoken || ['Français'],
        consultation_fee: doctor.consultation_fee,
        accepts_new_patients: doctor.accepts_new_patients,
        bio: doctor.bio,
        profile_picture_url: doctor.profile_picture_url,
        office_address: doctor.office_address,
        office_city: doctor.office_city,
        office_postal_code: doctor.office_postal_code,
        office_phone: doctor.office_phone,
        office_email: doctor.office_email,
        created_at: doctor.created_at,
        updated_at: doctor.updated_at,
        is_active: doctor.is_active,
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName || req.user.first_name,
          lastName: req.user.lastName || req.user.last_name
        },
        stats: stats
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Get doctor profile error:', error);
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Mettre à jour le profil
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const doctor = await Doctor.update(req.user.id, req.body);
      
      if (!doctor) {
        return res.status(404).json({ 
          error: 'Doctor profile not found' 
        });
      }

      res.json({
        message: 'Doctor profile updated successfully',
        doctor
      });
    } catch (error) {
      console.error('Update doctor error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Gestion des horaires
  async addSchedule(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      const schedule = await Doctor.addSchedule(doctor.id, req.body);

      res.status(201).json({
        message: 'Schedule added successfully',
        schedule
      });
    } catch (error) {
      console.error('Add schedule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMySchedules(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      const schedules = await Doctor.getSchedules(doctor.id);
      res.json(schedules);
    } catch (error) {
      console.error('Get schedules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Gestion des congés
  async addLeave(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      const leave = await Doctor.addLeave(doctor.id, req.body);

      res.status(201).json({
        message: 'Leave added successfully',
        leave
      });
    } catch (error) {
      console.error('Add leave error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Gestion des patients
  async assignPatient(req, res) {
    try {
      let doctor;
      
      // Si un doctorId est fourni (appel interne de l'appointment-service ou admin)
      if (req.body.doctorId) {
        doctor = await Doctor.findById(req.body.doctorId);
      } else {
        // Sinon, c'est le médecin qui s'assigne un patient lui-même
        doctor = await Doctor.findByUserId(req.user.id);
      }
      
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      // Vérifier que le patient existe via le service patient
      let patientProfileId = req.body.patientId;
      try {
        const patientResponse = await axios.get(
          `${process.env.PATIENT_SERVICE_URL}/api/patients/user/${req.body.patientId}`,
          {
            headers: { 
              Authorization: req.headers.authorization,
              'x-user-id': req.headers['x-user-id'],
              'x-user-role': req.headers['x-user-role']
            }
          }
        );
        // Si le patient a un profil, on utilise son ID externe ou au moins on trouve qu'il existe
      } catch (error) {
        console.error("Patient check failed:", error.message);
        // Si c'est une auto-assignation, on continue même sans le profil patient
        if (!req.headers['x-user-id']) {
          return res.status(404).json({ error: 'Patient not found' });
        }
      }

      const assignment = await Doctor.assignPatient(
        doctor.id, 
        req.body.patientId, // Utilise l'ID utilisateur
        req.body.notes
      );

      res.status(201).json({
        message: 'Patient assigned successfully',
        assignment
      });
    } catch (error) {
      console.error('Assign patient error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMyPatients(req, res) {
    try {
      const doctor = await Doctor.findByUserId(req.user.id);
      
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      const patientRows = await Doctor.getPatients(doctor.id);

      if (patientRows.length === 0) {
        return res.json([]);
      }

      // 1. Fetch user identities in bulk from auth-service
      const userIdList = [...new Set(patientRows.map(p => p.patient_id))];
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
        console.error('Error fetching bulk users from auth-service for patients:', authErr.message);
      }

      // 2. Fetch profiles from patient-service and merge
      const enrichedPatients = await Promise.all(
        patientRows.map(async (row) => {
          // Get user identity first (fallback or primary)
          const user = userMap[row.patient_id] || {};
          
          let profile = {};
          try {
            const profileRes = await axios.get(
              `${process.env.PATIENT_SERVICE_URL}/api/patients/user/${row.patient_id}`,
              {
                headers: {
                  'x-user-id': String(req.user.id),
                  'x-user-role': 'doctor',
                },
                timeout: 1000 // Don't hang if patient service is slow
              }
            );
            profile = profileRes.data?.patient || profileRes.data || {};
          } catch (err) {
            // Silently fail, we already have basic user identity
          }

          return {
            ...row,
            firstName: user.first_name || user.firstName || profile.first_name || profile.firstName || 'Patient',
            lastName: user.last_name || user.lastName || profile.last_name || profile.lastName || String(row.patient_id),
            email: user.email || profile.email || '',
            phone: user.phone || profile.phone || '',
            dateOfBirth: profile.date_of_birth || profile.dateOfBirth || null,
            lastVisit: row.assigned_date || null,
            condition: profile.medical_condition || 'General Checkup',
          };
        })
      );

      res.json(enrichedPatients);
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Recherche publique de médecins
  async searchDoctors(req, res) {
    try {
      const doctors = await Doctor.search(req.query);
      
      if (doctors.length === 0) {
        return res.json([]);
      }

      // Fetch user names from auth-service in bulk
      const userIdList = [...new Set(doctors.map(d => d.user_id))];
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
      const enrichedDoctors = doctors.map(d => {
        const user = userMap[d.user_id] || {};
        return {
          ...d,
          firstName: user.first_name || user.firstName || 'Doctor',
          lastName: user.last_name || user.lastName || String(d.license_number),
          email: user.email || d.office_email
        };
      });

      res.json(enrichedDoctors);
    } catch (error) {
      console.error('Search doctors error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ⭐⭐⭐ VERSION CORRIGÉE - getPublicProfile ⭐⭐⭐
  async getPublicProfile(req, res) {
    try {
      console.log('🔍 Recherche médecin public avec ID:', req.params.id);
      
      // Récupérer le docteur
      const doctor = await Doctor.findById(req.params.id);
      
      if (!doctor) {
        console.log('❌ Médecin non trouvé avec ID:', req.params.id);
        return res.status(404).json({ error: 'Doctor not found' });
      }

      // Récupérer les informations utilisateur depuis le service auth
      let userData = {};
      try {
        const authRes = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/users/${doctor.user_id}`);
        userData = authRes.data || {};
      } catch (authErr) {
        console.error('Error fetching user data from auth-service:', authErr.message);
      }

      console.log('✅ Médecin trouvé:', doctor.id);

      // Créer une copie sans les informations sensibles
      const publicDoctor = { ...doctor };
      delete publicDoctor.user_id;  // Enlever l'ID utilisateur interne

      // Récupérer les évaluations (si la table existe)
      let reviews = [];
      try {
        const reviewsResult = await db.query(
          `SELECT rating, comment, created_at 
           FROM doctor_reviews 
           WHERE doctor_id = $1 
           ORDER BY created_at DESC 
           LIMIT 10`,
          [doctor.id]
        );
        reviews = reviewsResult.rows;
      } catch (reviewError) {
        console.log('Pas d\'évaluations ou table non existante');
        // Ignorer l'erreur, on retourne juste un tableau vide
      }

      // Retourner le profil public
      res.json({
        id: publicDoctor.id,
        firstName: userData.first_name || userData.firstName || 'Doctor',
        lastName: userData.last_name || userData.lastName || String(publicDoctor.license_number),
        license_number: publicDoctor.license_number,
        specialization: publicDoctor.specialization,
        sub_specializations: publicDoctor.sub_specializations || [],
        years_experience: publicDoctor.years_experience,
        consultation_fee: publicDoctor.consultation_fee,
        accepts_new_patients: publicDoctor.accepts_new_patients,
        bio: publicDoctor.bio,
        office_address: publicDoctor.office_address,
        office_city: publicDoctor.office_city,
        office_postal_code: publicDoctor.office_postal_code,
        office_phone: publicDoctor.office_phone,
        office_email: publicDoctor.office_email,
        languages_spoken: publicDoctor.languages_spoken || ['Français'],
        recent_reviews: reviews
      });

    } catch (error) {
      console.error('❌ Get public profile error:', error);
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ✅ Nouvelle méthode utilitaire pour vérifier l'existence d'un médecin
  async checkDoctorExists(req, res) {
    try {
      const { id } = req.params;
      console.log('🔍 Vérification existence médecin ID:', id);
      
      const doctor = await Doctor.findById(id);
      
      res.json({
        exists: !!doctor,
        id: id,
        doctor: doctor ? {
          id: doctor.id,
          license_number: doctor.license_number,
          specialization: doctor.specialization,
          office_city: doctor.office_city
        } : null
      });
    } catch (error) {
      console.error('❌ Check doctor exists error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        exists: false 
      });
    }
  }

  // Obtenir les disponibilités
  async getAvailability(req, res) {
    try {
      const { doctorId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const availability = await Doctor.getAvailability(doctorId, startDate, endDate);
      res.json(availability);
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Ajouter une évaluation
  async addReview(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const review = await Doctor.addReview(req.params.doctorId, {
        patient_id: req.user.id,
        ...req.body
      });

      res.status(201).json({
        message: 'Review added successfully',
        review
      });
    } catch (error) {
      console.error('Add review error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Obtenir les statistiques (pour admin)
  async getAllDoctorsStats(req, res) {
    try {
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_doctors,
          COUNT(DISTINCT specialization) as specializations,
          AVG(years_experience) as avg_experience,
          COUNT(CASE WHEN accepts_new_patients THEN 1 END) as accepting_patients
        FROM doctors
        WHERE is_active = true
      `);
      
      res.json(stats.rows[0]);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new DoctorController();