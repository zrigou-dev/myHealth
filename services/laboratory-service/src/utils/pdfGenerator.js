const PDFDocument = require('pdfkit');
const moment = require('moment');

class PDFGenerator {
  static async generateLabReport(data) {
    return new Promise((resolve, reject) => {
      try {
        const { request, results, tests, patient, doctor } = data;
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // En-tête
        doc.fontSize(20).text('MYHEART LABORATOIRE', 50, 50);
        doc.fontSize(10).text('123 Rue de la Santé', 50, 75);
        doc.text('75001 Paris, France', 50, 90);
        doc.text('Tél: +33 1 23 45 67 89', 50, 105);

        // Titre du rapport
        doc.fontSize(16).text('RAPPORT D\'ANALYSES', 400, 50);
        doc.fontSize(10).text(`N°: ${request.request_number}`, 400, 75);
        doc.text(`Date: ${moment(request.request_date).format('DD/MM/YYYY')}`, 400, 90);
        doc.text(`Statut: ${request.status}`, 400, 105);

        // Ligne de séparation
        doc.moveTo(50, 140).lineTo(550, 140).stroke();

        // Informations patient
        doc.fontSize(12).text('Patient:', 50, 160);
        doc.fontSize(10).text(`${patient.first_name} ${patient.last_name}`, 50, 180);
        doc.text(`ID: ${patient.id}`, 50, 195);

        // Informations médecin
        doc.fontSize(12).text('Médecin prescripteur:', 300, 160);
        doc.fontSize(10).text(`Dr. ${doctor.first_name} ${doctor.last_name}`, 300, 180);
        doc.text(doctor.specialization || '', 300, 195);

        // Informations cliniques
        if (request.clinical_info) {
          doc.fontSize(12).text('Informations cliniques:', 50, 230);
          doc.fontSize(10).text(request.clinical_info, 50, 250, { width: 500 });
        }

        // Tableau des résultats
        const tableTop = request.clinical_info ? 300 : 250;
        
        // En-têtes du tableau
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Analyse', 50, tableTop);
        doc.text('Résultat', 200, tableTop);
        doc.text('Unité', 300, tableTop);
        doc.text('Normes', 350, tableTop);
        doc.text('Statut', 450, tableTop);

        doc.font('Helvetica');
        let y = tableTop + 20;

        // Grouper les résultats par test
        const resultsByTest = {};
        results.forEach(result => {
          if (!resultsByTest[result.test_id]) {
            const test = tests.find(t => t.test_id === result.test_id);
            resultsByTest[result.test_id] = {
              test_name: test?.test_name || 'Analyse',
              results: []
            };
          }
          resultsByTest[result.test_id].results.push(result);
        });

        // Afficher les résultats
        Object.values(resultsByTest).forEach(testGroup => {
          // Nom du test
          doc.font('Helvetica-Bold');
          doc.text(testGroup.test_name, 50, y);
          y += 15;
          doc.font('Helvetica');

          // Résultats individuels
          testGroup.results.forEach(result => {
            const flag = result.flag || 'normal';
            const flagColor = {
              'normal': 'green',
              'low': 'orange',
              'high': 'orange',
              'critical_low': 'red',
              'critical_high': 'red',
              'abnormal': 'red'
            }[flag] || 'black';

            doc.fillColor('black');
            doc.text('-', 50, y);
            doc.text(result.result_value?.toString() || result.result_text || '-', 200, y);
            doc.text(result.unit || '-', 300, y);
            
            const range = result.reference_range_min && result.reference_range_max 
              ? `${result.reference_range_min} - ${result.reference_range_max}`
              : '-';
            doc.text(range, 350, y);
            
            doc.fillColor(flagColor);
            doc.text(flag, 450, y);
            doc.fillColor('black');
            
            y += 15;
          });
          
          y += 5;
        });

        // Ligne de séparation
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 20;

        // Légende
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Légende:', 50, y);
        y += 15;
        doc.font('Helvetica');
        doc.fillColor('green').text('● Normal', 50, y);
        doc.fillColor('orange').text('● Anormal (bas/élevé)', 150, y);
        doc.fillColor('red').text('● Critique', 300, y);
        doc.fillColor('black');

        y += 30;

        // Signatures
        doc.text('Technicien de laboratoire:', 50, y);
        doc.text('_________________________', 50, y + 15);
        
        doc.text('Validation médicale:', 350, y);
        doc.text('_________________________', 350, y + 15);

        // Pied de page
        const bottomY = 700;
        doc.fontSize(8);
        doc.text('Ce document est un résultat d\'analyse médicale.', 50, bottomY);
        doc.text('Pour toute question, contactez votre médecin.', 50, bottomY + 15);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;