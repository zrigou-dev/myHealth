const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Créer le transporteur
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Vérifier la connexion (optionnel, pour le debug)
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️ Email non configuré - mode simulation');
  } else {
    console.log('✅ Serveur email prêt');
  }
});

// Fonction simple d'envoi d'email
const sendEmail = async (to, subject, html) => {
  // Mode simulation si pas configuré
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your.email@gmail.com') {
    console.log('📧 [SIMULATION] Email envoyé à:', to);
    console.log('   Sujet:', subject);
    console.log('   Contenu:', html.substring(0, 100) + '...');
    return { success: true, simulated: true };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email envoyé à ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    throw error;
  }
};

module.exports = { sendEmail };