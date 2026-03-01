const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/emailSender');
const { validationResult } = require('express-validator');

class NotificationController {
  // Envoyer un email
  async sendEmail(req, res) {
    try {
      console.log('📨 Requête reçue:', req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Erreurs validation:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { user_id, to, subject, html, channel, metadata } = req.body;

      console.log('📧 Création notification...');

      // Créer la notification en base
      const notification = await Notification.create({
        user_id,
        type: 'email',
        channel: channel || 'general',
        recipient: to,
        subject,
        content: html,
        metadata
      });

      console.log('✅ Notification créée avec ID:', notification.id);

      // Envoyer l'email
      try {
        const result = await sendEmail(to, subject, html);
        
        // Marquer comme envoyée
        await Notification.markAsSent(notification.id);
        
        res.status(201).json({
          success: true,
          message: 'Email envoyé avec succès',
          notificationId: notification.id,
          simulated: result.simulated || false
        });
      } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        
        // Marquer comme échouée
        await Notification.markAsFailed(notification.id, error.message);
        
        res.status(500).json({
          success: false,
          error: "Erreur lors de l'envoi de l'email",
          details: error.message
        });
      }
    } catch (error) {
      console.error('❌ Erreur générale:', error);
      res.status(500).json({ 
        error: 'Erreur interne',
        message: error.message 
      });
    }
  }

  // Health check
  async health(req, res) {
    res.json({
      status: 'healthy',
      service: 'notification-service',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new NotificationController();