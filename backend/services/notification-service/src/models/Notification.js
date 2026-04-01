const db = require('../config/database');

class Notification {
  // Créer une notification
  static async create(notificationData) {
    const {
      user_id, type, channel, recipient,
      subject, content, metadata
    } = notificationData;

    console.log('📝 Création notification:', { user_id, type, channel, recipient });

    const query = `
      INSERT INTO notifications (
        user_id, type, channel, recipient,
        subject, content, metadata, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *
    `;

    const values = [
      user_id, type, channel, recipient,
      subject, content, metadata || {}
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Marquer comme envoyée
  static async markAsSent(id) {
    const query = `
      UPDATE notifications 
      SET status = 'sent', sent_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Marquer comme échouée
  static async markAsFailed(id, error) {
    const query = `
      UPDATE notifications 
      SET status = 'failed', error_message = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id, error]);
    return result.rows[0];
  }

  // Marquer comme lue
  static async markAsRead(id) {
    const query = `
      UPDATE notifications 
      SET is_read = true
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Récupérer les notifications d'un utilisateur
  static async getByUser(userId, limit = 50) {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }

  // Récupérer une notification par ID
  static async findById(id) {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Notification;