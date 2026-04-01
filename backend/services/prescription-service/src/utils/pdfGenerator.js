const PDFDocument = require('pdfkit');
const moment = require('moment');

class PDFGenerator {
  static async generatePrescription(data) {
    return new Promise((resolve, reject) => {
      try {
        const { prescription, items, patient, doctor } = data;
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // En-tête
        doc.fontSize(20).text('ORDONNANCE MÉDICALE', 50, 50, { align: 'center' });
        
        // Ligne de séparation
        doc.moveTo(50, 80).lineTo(550, 80).stroke();

        // Informations médecin
        doc.fontSize(12).text('Dr. ' + (doctor.first_name || '') + ' ' + (doctor.last_name || ''), 50, 100);
        doc.fontSize(10).text(doctor.specialization || 'Médecin traitant', 50, 115);
        doc.text('N° RPPS: ' + (doctor.license_number || '__________'), 50, 130);

        // Informations patient
        doc.fontSize(12).text('Patient: ' + (patient.first_name || '') + ' ' + (patient.last_name || ''), 350, 100);
        doc.fontSize(10).text('N° Sécurité Sociale: ________________', 350, 115);

        // Date
        doc.text('Date: ' + moment(prescription.prescription_date).format('DD/MM/YYYY'), 350, 140);

        // N° Ordonnance
        doc.text('N°: ' + prescription.prescription_number, 350, 155);

        // Ligne de séparation
        doc.moveTo(50, 170).lineTo(550, 170).stroke();

        // Titre
        doc.fontSize(14).text('PRESCRIPTION', 50, 190);

        // Tableau des médicaments
        let y = 220;

        items.forEach((item, index) => {
          // Nom du médicament
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text(item.medication_name, 50, y);
          y += 15;

          // Posologie
          doc.fontSize(10).font('Helvetica');
          let dosage = '';
          if (item.dosage_value) {
            dosage += item.dosage_value + ' ' + (item.dosage_unit || 'mg');
          }
          if (item.strength) {
            dosage += (dosage ? ' - ' : '') + item.strength;
          }
          
          let posology = '';
          if (item.frequency_value) {
            posology = item.frequency_value + ' fois par ' + (item.frequency_unit || 'jour');
          }
          if (item.duration_value) {
            posology += ' pendant ' + item.duration_value + ' ' + (item.duration_unit || 'jours');
          }

          doc.text('Dosage: ' + (dosage || '__________'), 70, y);
          y += 15;
          doc.text('Posologie: ' + (posology || '__________'), 70, y);
          y += 15;
          doc.text('Quantité: ' + item.quantity + ' ' + (item.quantity_unit || 'unités'), 70, y);
          y += 20;

          if (item.instructions) {
            doc.text('Instructions: ' + item.instructions, 70, y, { width: 480 });
            y += 25;
          }

          // Séparation entre médicaments
          if (index < items.length - 1) {
            doc.moveTo(70, y).lineTo(530, y).stroke();
            y += 15;
          }
        });

        // Instructions générales
        if (prescription.patient_instructions) {
          y += 10;
          doc.fontSize(11).font('Helvetica-Bold').text('Instructions générales:', 50, y);
          y += 15;
          doc.fontSize(10).font('Helvetica').text(prescription.patient_instructions, 70, y, { width: 480 });
        }

        // Signature
        y = 700;
        doc.fontSize(10).text('Fait à Paris, le ' + moment().format('DD/MM/YYYY'), 350, y);
        y += 20;
        doc.text('Signature du médecin:', 350, y);
        doc.text('_________________________', 350, y + 15);

        // Mentions légales
        doc.fontSize(8);
        doc.text('Cette ordonnance est valable ' + (prescription.renewals_allowed || 1) + ' renouvellement(s)', 50, 750);
        doc.text('Date d\'expiration: ' + moment(prescription.expiry_date).format('DD/MM/YYYY'), 50, 765);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;