const axios = require('axios');
const PatientService = require('../services/patientService');
const DoctorService = require('../services/doctorService');
const AppointmentService = require('../services/appointmentService');
const LaboratoryService = require('../services/laboratoryService');
const PharmacyService = require('../services/pharmacyService');
const PrescriptionService = require('../services/prescriptionService');

class Aggregator {
  constructor() {
    this.services = {
      patient: process.env.PATIENT_SERVICE_URL,
      doctor: process.env.DOCTOR_SERVICE_URL,
      appointment: process.env.APPOINTMENT_SERVICE_URL,
      laboratory: process.env.LABORATORY_SERVICE_URL,
      pharmacy: process.env.PHARMACY_SERVICE_URL,
      prescription: process.env.PRESCRIPTION_SERVICE_URL
    };
  }

  // Agrégation complète du dossier patient
  async aggregateFullRecord(patientId, token) {
    try {
      console.log(`🔄 Agrégation des données pour le patient ${patientId}`);

      const [
        patientInfo,
        appointments,
        labResults,
        prescriptions,
        dispensations
      ] = await Promise.allSettled([
        PatientService.getPatient(patientId, token),
        AppointmentService.getPatientAppointments(patientId, token),
        LaboratoryService.getPatientResults(patientId, token),
        PrescriptionService.getPatientPrescriptions(patientId, token),
        PharmacyService.getPatientDispensations(patientId, token)
      ]);

      const result = {
        patient: patientInfo.status === 'fulfilled' ? patientInfo.value : null,
        appointments: appointments.status === 'fulfilled' ? appointments.value : [],
        laboratory: labResults.status === 'fulfilled' ? labResults.value : [],
        prescriptions: prescriptions.status === 'fulfilled' ? prescriptions.value : [],
        dispensations: dispensations.status === 'fulfilled' ? dispensations.value : []
      };

      // Enrichir les données
      result.appointments = await this.enrichAppointments(result.appointments, token);
      result.prescriptions = await this.enrichPrescriptions(result.prescriptions, token);
      result.laboratory = this.enrichLabResults(result.laboratory);

      console.log(`✅ Agrégation terminée pour le patient ${patientId}`);
      return result;
    } catch (error) {
      console.error('❌ Erreur agrégation:', error);
      throw error;
    }
  }

  // Enrichir les rendez-vous avec les noms des médecins
  async enrichAppointments(appointments, token) {
    if (!appointments || appointments.length === 0) return appointments;

    const enriched = await Promise.all(appointments.map(async (apt) => {
      try {
        if (apt.doctor_id) {
          const doctor = await DoctorService.getDoctor(apt.doctor_id);
          return {
            ...apt,
            doctor_name: doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Médecin inconnu',
            doctor_specialization: doctor?.specialization
          };
        }
        return apt;
      } catch (error) {
        return apt;
      }
    }));

    return enriched;
  }

  // Enrichir les prescriptions avec les détails des médicaments
  async enrichPrescriptions(prescriptions, token) {
    if (!prescriptions || prescriptions.length === 0) return prescriptions;

    const enriched = await Promise.all(prescriptions.map(async (pres) => {
      try {
        if (pres.doctor_id) {
          const doctor = await DoctorService.getDoctor(pres.doctor_id);
          pres.doctor_name = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Médecin inconnu';
        }
        return pres;
      } catch (error) {
        return pres;
      }
    }));

    return enriched;
  }

  // Enrichir les résultats de laboratoire
  enrichLabResults(results) {
    if (!results || results.length === 0) return results;

    return results.map(result => ({
      ...result,
      interpretation: this.interpretLabResult(result),
      is_critical: this.isCriticalResult(result)
    }));
  }

  // Interpréter un résultat de laboratoire
  interpretLabResult(result) {
    if (!result.reference_ranges || !result.result_value) {
      return 'Non interprétable';
    }

    try {
      const ranges = typeof result.reference_ranges === 'string' 
        ? JSON.parse(result.reference_ranges) 
        : result.reference_ranges;

      const normal = ranges.normal || ranges;
      
      if (normal.min !== undefined && result.result_value < normal.min) {
        return 'En dessous des normes';
      }
      if (normal.max !== undefined && result.result_value > normal.max) {
        return 'Au-dessus des normes';
      }
      return 'Dans les normes';
    } catch (error) {
      return 'Référence non disponible';
    }
  }

  // Vérifier si un résultat est critique
  isCriticalResult(result) {
    if (!result.reference_ranges || !result.result_value) return false;

    try {
      const ranges = typeof result.reference_ranges === 'string' 
        ? JSON.parse(result.reference_ranges) 
        : result.reference_ranges;

      const critical = ranges.critical || ranges;
      
      if (critical.critical_min !== undefined && result.result_value < critical.critical_min) {
        return true;
      }
      if (critical.critical_max !== undefined && result.result_value > critical.critical_max) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Générer une chronologie médicale
  async getTimeline(patientId, token) {
    const data = await this.aggregateFullRecord(patientId, token);
    
    const timeline = [];

    // Ajouter les rendez-vous
    if (data.appointments) {
      data.appointments.forEach(apt => {
        timeline.push({
          id: apt.id,
          date: apt.date,
          type: 'appointment',
          title: `Consultation avec ${apt.doctor_name || 'médecin'}`,
          description: apt.reason || 'Consultation médicale',
          status: apt.status,
          data: apt
        });
      });
    }

    // Ajouter les résultats de laboratoire
    if (data.laboratory) {
      data.laboratory.forEach(lab => {
        timeline.push({
          id: lab.id,
          date: lab.performed_at || lab.date,
          type: 'laboratory',
          title: `Analyse: ${lab.test_name || 'Laboratoire'}`,
          description: lab.interpretation || `${lab.result_value} ${lab.unit || ''}`,
          status: lab.is_critical ? 'critique' : 'normal',
          data: lab
        });
      });
    }

    // Ajouter les prescriptions
    if (data.prescriptions) {
      data.prescriptions.forEach(pres => {
        timeline.push({
          id: pres.id,
          date: pres.prescription_date,
          type: 'prescription',
          title: 'Nouvelle prescription',
          description: `${pres.items_count || 0} médicament(s) prescrit(s)`,
          status: pres.status,
          data: pres
        });
      });
    }

    // Ajouter les délivrances
    if (data.dispensations) {
      data.dispensations.forEach(del => {
        timeline.push({
          id: del.id,
          date: del.dispensation_date,
          type: 'dispensation',
          title: 'Délivrance de médicaments',
          description: `Délivrance ${del.status || 'effectuée'}`,
          data: del
        });
      });
    }

    // Trier par date décroissante
    return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Obtenir des recommandations basées sur l'historique
  async getRecommendations(patientId, token) {
    const data = await this.aggregateFullRecord(patientId, token);
    const recommendations = [];

    // Vérifier les vaccinations dues
    if (data.appointments) {
      // Logique pour recommandations de vaccination
    }

    // Vérifier les résultats anormaux
    if (data.laboratory) {
      const abnormalResults = data.laboratory.filter(r => r.is_critical);
      if (abnormalResults.length > 0) {
        recommendations.push({
          type: 'alert',
          priority: 'high',
          title: 'Résultats critiques',
          description: `${abnormalResults.length} résultat(s) critique(s) nécessitent votre attention`
        });
      }
    }

    // Vérifier les consultations de suivi
    const lastConsultation = data.appointments?.[0];
    if (lastConsultation) {
      const daysSinceLastConsult = this.daysSince(new Date(lastConsultation.date));
      if (daysSinceLastConsult > 180) { // 6 mois
        recommendations.push({
          type: 'reminder',
          priority: 'medium',
          title: 'Consultation de suivi',
          description: 'Il est recommandé de planifier une consultation de suivi'
        });
      }
    }

    return recommendations;
  }

  // Calculer le nombre de jours depuis une date
  daysSince(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Chercher des patients similaires (pour études)
  async findSimilarPatients(patientId, token, criteria = {}) {
    // Cette fonctionnalité serait implémentée avec des algorithmes de matching
    // Retourne des IDs de patients avec des profils similaires
    return [];
  }

  // Générer un résumé pour l'IA/ML
  async generateAISummary(patientId, token) {
    const data = await this.aggregateFullRecord(patientId, token);
    
    return {
      demographics: {
        age: data.patient?.age,
        gender: data.patient?.gender
      },
      clinical: {
        conditions: data.conditions || [],
        allergies: data.allergies || [],
        medications: this.extractCurrentMedications(data.prescriptions)
      },
      trends: this.extractTrends(data.vital_signs || []),
      risk_factors: this.identifyRiskFactors(data)
    };
  }

  // Extraire les médicaments actuels
  extractCurrentMedications(prescriptions) {
    const medications = new Set();
    if (!prescriptions) return [];

    prescriptions.forEach(pres => {
      if (pres.status === 'active' && pres.items) {
        pres.items.forEach(item => {
          medications.add({
            name: item.medication_name,
            dosage: item.dosage,
            frequency: item.frequency
          });
        });
      }
    });

    return Array.from(medications);
  }

  // Extraire les tendances
  extractTrends(vitalSigns) {
    // Logique d'extraction de tendances
    return {};
  }

  // Identifier les facteurs de risque
  identifyRiskFactors(data) {
    const risks = [];

    // Vérifier l'âge
    if (data.patient?.age > 65) {
      risks.push('Âge avancé');
    }

    // Vérifier l'IMC
    const latestVitals = data.vital_signs?.[0];
    if (latestVitals) {
      const bmi = this.calculateBMI(latestVitals.height, latestVitals.weight);
      if (bmi > 30) {
        risks.push('Obésité');
      } else if (bmi < 18.5) {
        risks.push('Insuffisance pondérale');
      }
    }

    // Vérifier les conditions chroniques
    if (data.conditions) {
      const chronicConditions = data.conditions.filter(c => c.is_chronic);
      if (chronicConditions.length > 0) {
        risks.push(...chronicConditions.map(c => c.condition_name));
      }
    }

    return risks;
  }

  // Calculer l'IMC
  calculateBMI(height, weight) {
    if (!height || !weight) return null;
    const heightInM = height / 100;
    return parseFloat((weight / (heightInM * heightInM)).toFixed(1));
  }
}

module.exports = new Aggregator();