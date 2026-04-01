const PDFDocument = require('pdfkit');
const moment = require('moment');

class PDFGenerator {
  static async generateInvoice(invoice, patient, doctor, items = []) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // En-tête
        doc.fontSize(20).text('MYHEART', 50, 50);
        doc.fontSize(10).text('123 Rue de la Santé', 50, 75);
        doc.text('75001 Paris, France', 50, 90);
        doc.text('Tél: +33 1 23 45 67 89', 50, 105);

        // Numéro de facture
        doc.fontSize(16).text('FACTURE', 400, 50);
        doc.fontSize(10).text(`N°: ${invoice.invoice_number}`, 400, 75);
        doc.text(`Date: ${moment(invoice.invoice_date).format('DD/MM/YYYY')}`, 400, 90);
        doc.text(`Échéance: ${moment(invoice.due_date).format('DD/MM/YYYY')}`, 400, 105);

        // Ligne de séparation
        doc.moveTo(50, 140).lineTo(550, 140).stroke();

        // Informations patient
        doc.fontSize(12).text('Facturé à:', 50, 160);
        doc.fontSize(10).text(`${patient.first_name} ${patient.last_name}`, 50, 180);
        doc.text(patient.address || '', 50, 195);
        doc.text(`${patient.city || ''} ${patient.postal_code || ''}`, 50, 210);

        // Informations médecin
        doc.fontSize(12).text('Médecin:', 300, 160);
        doc.fontSize(10).text(`Dr. ${doctor.first_name} ${doctor.last_name}`, 300, 180);
        doc.text(doctor.specialization || '', 300, 195);
        doc.text(doctor.office_phone || '', 300, 210);

        // Tableau des articles
        const tableTop = 260;
        
        // En-têtes du tableau
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Description', 50, tableTop);
        doc.text('Qté', 300, tableTop);
        doc.text('Prix unitaire', 350, tableTop);
        doc.text('Total', 450, tableTop);

        doc.font('Helvetica');
        let y = tableTop + 20;

        // Articles
        items.forEach(item => {
          doc.text(item.description, 50, y);
          doc.text(item.quantity.toString(), 300, y);
          doc.text(`${item.unit_price.toFixed(2)} €`, 350, y);
          doc.text(`${(item.quantity * item.unit_price).toFixed(2)} €`, 450, y);
          y += 20;
        });

        // Ligne de séparation
        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 20;

        // Totaux
        doc.font('Helvetica-Bold');
        doc.text('Sous-total:', 350, y);
        doc.text(`${invoice.subtotal.toFixed(2)} €`, 450, y);
        y += 20;

        doc.text(`TVA (${process.env.VAT_RATE}%):`, 350, y);
        doc.text(`${invoice.tax_amount.toFixed(2)} €`, 450, y);
        y += 20;

        doc.fontSize(12).text('TOTAL:', 350, y);
        doc.text(`${invoice.total_amount.toFixed(2)} €`, 450, y);
        y += 30;

        // Montant payé
        if (invoice.amount_paid > 0) {
          doc.fontSize(10).text('Déjà payé:', 350, y);
          doc.text(`${invoice.amount_paid.toFixed(2)} €`, 450, y);
          y += 20;
          doc.text('Reste à payer:', 350, y);
          doc.text(`${invoice.amount_due.toFixed(2)} €`, 450, y);
        }

        // Pied de page
        const bottomY = 700;
        doc.fontSize(8);
        doc.text('Merci de votre confiance', 50, bottomY);
        doc.text('Paiement à réception', 400, bottomY);
        doc.text('IBAN: FR76 1234 5678 9012 3456 7890 123', 50, bottomY + 15);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static async generateQuote(quote, patient, doctor, items) {
    // Similaire à generateInvoice mais pour les devis
    return this.generateInvoice(quote, patient, doctor, items);
  }
}

module.exports = PDFGenerator;