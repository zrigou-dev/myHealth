const PDFDocument = require('pdfkit');
const moment = require('moment');

class PDFGenerator {
  // Générer un rapport médical complet
  static async generateMedicalReport(data) {
    return new Promise((resolve, reject) => {
      try {
        const { patient, doctor, medicalData } = data;
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // En-tête
        doc.fontSize(20).text('DOSSIER MÉDICAL', 50, 50, { align: 'center' });
        
        // Ligne de séparation
        doc.moveTo(50, 80).lineTo(550, 80).stroke();

        // Informations patient
        doc.fontSize(12).text('Patient:', 50, 100);
        doc.fontSize(10).text(`${patient.first_name} ${patient.last_name}`, 50, 115);
        doc.text(`Né(e) le: ${moment(patient.birth_date).format('DD/MM/YYYY')}`, 50, 130);
        doc.text(`Taille: ${medicalData.vitals?.height || '---'} cm`, 50, 145);
        doc.text(`Poids: ${medicalData.vitals?.weight || '---'} kg`, 50, 160);

        // Informations médecin
        doc.fontSize(12).text('Médecin traitant:', 300, 100);
        doc.fontSize(10).text(`Dr. ${doctor.first_name} ${doctor.last_name}`, 300, 115);
        doc.text(doctor.specialization || '', 300, 130);

        // Date du rapport
        doc.text(`Rapport du: ${moment().format('DD/MM/YYYY HH:mm')}`, 300, 160);

        // Ligne de séparation
        doc.moveTo(50, 180).lineTo(550, 180).stroke();

        let y = 200;

        // Constantes vitales
        if (medicalData.vitals) {
          doc.fontSize(14).text('Constantes vitales', 50, y);
          y += 20;

          const vitals = medicalData.vitals;
          doc.fontSize(10);
          doc.text(`Tension: ${vitals.systolic_bp || '---'}/${vitals.diastolic_bp || '---'} mmHg`, 70, y);
          y += 15;
          doc.text(`Fréquence cardiaque: ${vitals.heart_rate || '---'} bpm`, 70, y);
          y += 15;
          doc.text(`Température: ${vitals.temperature || '---'} °C`, 70, y);
          y += 15;
          doc.text(`Saturation O2: ${vitals.oxygen_saturation || '---'} %`, 70, y);
          y += 15;
          doc.text(`Glycémie: ${vitals.blood_glucose || '---'} mmol/L`, 70, y);
          y += 25;
        }

        // Allergies
        if (medicalData.allergies?.length > 0) {
          doc.fontSize(14).text('Allergies', 50, y);
          y += 20;

          medicalData.allergies.forEach(allergy => {
            doc.fontSize(10);
            doc.text(`• ${allergy.allergen} (${allergy.severity})`, 70, y);
            y += 15;
            if (allergy.reaction) {
              doc.text(`  Réaction: ${allergy.reaction}`, 85, y);
              y += 15;
            }
          });
          y += 10;
        }

        // Antécédents
        if (medicalData.conditions?.length > 0) {
          doc.fontSize(14).text('Antécédents médicaux', 50, y);
          y += 20;

          medicalData.conditions.forEach(condition => {
            doc.fontSize(10);
            const status = condition.is_resolved ? '(Résolu)' : '(Actif)';
            doc.text(`• ${condition.condition_name} ${status}`, 70, y);
            y += 15;
            if (condition.icd10_code) {
              doc.text(`  Code CIM-10: ${condition.icd10_code}`, 85, y);
              y += 15;
            }
          });
          y += 10;
        }

        // Vaccinations
        if (medicalData.vaccinations?.length > 0) {
          doc.fontSize(14).text('Vaccinations', 50, y);
          y += 20;

          medicalData.vaccinations.forEach(vaccine => {
            doc.fontSize(10);
            doc.text(`• ${vaccine.vaccine_name}`, 70, y);
            y += 15;
            doc.text(`  Administré le: ${moment(vaccine.administration_date).format('DD/MM/YYYY')}`, 85, y);
            y += 15;
            if (vaccine.next_due_date) {
              doc.text(`  Prochain rappel: ${moment(vaccine.next_due_date).format('DD/MM/YYYY')}`, 85, y);
              y += 15;
            }
          });
          y += 10;
        }

        // Résumés
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(14).text('Résumé des consultations', 50, y);
        y += 20;

        if (medicalData.external_data?.appointments?.length > 0) {
          medicalData.external_data.appointments.slice(0, 5).forEach(apt => {
            doc.fontSize(10);
            doc.text(`• ${moment(apt.date).format('DD/MM/YYYY')} - Consultation`, 70, y);
            y += 15;
            if (apt.reason) {
              doc.text(`  Motif: ${apt.reason}`, 85, y);
              y += 15;
            }
          });
        } else {
          doc.fontSize(10).text('Aucune consultation enregistrée', 70, y);
          y += 15;
        }

        y += 10;

        // Derniers résultats de laboratoire
        doc.fontSize(14).text('Derniers résultats d\'analyses', 50, y);
        y += 20;

        if (medicalData.external_data?.laboratory?.length > 0) {
          medicalData.external_data.laboratory.slice(0, 5).forEach(lab => {
            doc.fontSize(10);
            doc.text(`• ${lab.test_name}: ${lab.result_value} ${lab.unit || ''}`, 70, y);
            y += 15;
            if (lab.flag && lab.flag !== 'normal') {
              doc.text(`  ${lab.flag}`, 85, y);
              y += 15;
            }
          });
        } else {
          doc.fontSize(10).text('Aucune analyse enregistrée', 70, y);
          y += 15;
        }

        // Pied de page
        const bottomY = 750;
        doc.fontSize(8);
        doc.text('Document médical confidentiel', 50, bottomY);
        doc.text('Ne peut être communiqué à des tiers sans accord du patient', 50, bottomY + 15);
        doc.text(`Généré le ${moment().format('DD/MM/YYYY à HH:mm')}`, 350, bottomY);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Générer un certificat médical
  static async generateMedicalCertificate(data) {
    return new Promise((resolve, reject) => {
      try {
        const { patient, doctor, diagnosis, duration, notes } = data;
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        doc.fontSize(20).text('CERTIFICAT MÉDICAL', 50, 50, { align: 'center' });
        doc.moveTo(50, 80).lineTo(550, 80).stroke();

        doc.fontSize(12).text('Je soussigné, Dr. ' + doctor.first_name + ' ' + doctor.last_name, 50, 120);
        doc.text('certifie avoir examiné ce jour le patient :', 50, 140);
        doc.fontSize(14).text(patient.first_name + ' ' + patient.last_name, 50, 160);
        doc.fontSize(12).text('Né(e) le : ' + moment(patient.birth_date).format('DD/MM/YYYY'), 50, 180);

        doc.text('Diagnostic :', 50, 220);
        doc.fontSize(11).text(diagnosis, 70, 240, { width: 480 });

        if (duration) {
          doc.fontSize(12).text('Durée de l\'arrêt de travail :', 50, 300);
          doc.text(duration + ' jours', 70, 320);
        }

        if (notes) {
          doc.text('Observations :', 50, 360);
          doc.fontSize(11).text(notes, 70, 380, { width: 480 });
        }

        doc.fontSize(12).text('Fait à Paris, le ' + moment().format('DD/MM/YYYY'), 350, 500);
        doc.text('Signature du médecin :', 350, 520);
        doc.text('_________________________', 350, 540);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;