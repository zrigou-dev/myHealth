const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('📧 Configuration PostgreSQL notification:');
console.log('   HOST:', process.env.DB_HOST);
console.log('   PORT:', process.env.DB_PORT);
console.log('   DATABASE:', process.env.DB_NAME);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
  console.log('✅ Connecté à PostgreSQL notification');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL notification:', err);
});

const createTables = async () => {
  console.log('🔄 Création de la table notifications...');
  
  const createTable = `
    CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        content TEXT NOT NULL,
        metadata JSONB,
        error_message TEXT,
        is_read BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
  `;

  try {
    await pool.query(createTable);
    console.log('✅ Table notifications créée avec succès');
  } catch (error) {
    console.error('❌ Erreur création table:', error);
  }
};

setTimeout(createTables, 2000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};