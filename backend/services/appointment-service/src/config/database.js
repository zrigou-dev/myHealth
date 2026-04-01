const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔄 Configuration PostgreSQL rendez-vous:');
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
  console.log('✅ Connecté à PostgreSQL rendez-vous');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL rendez-vous:', err);
});

const createTables = async () => {
  console.log('🔄 Création des tables rendez-vous...');
  
  const createAppointmentTables = `
    -- Type ENUM pour le statut des rendez-vous
    DO $$ BEGIN
        CREATE TYPE appointment_status AS ENUM (
            'scheduled', 'confirmed', 'completed', 
            'cancelled', 'no_show', 'rescheduled', 'rejected'
        );
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    -- Table principale des rendez-vous
    CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        status appointment_status DEFAULT 'scheduled',
        reason TEXT,
        notes TEXT,
        cancellation_reason TEXT,
        rescheduled_from INTEGER REFERENCES appointments(id),
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        completed_at TIMESTAMP,
        
        -- Contraintes
        CONSTRAINT valid_appointment_time CHECK (end_time > start_time),
        CONSTRAINT future_appointment CHECK (appointment_date >= CURRENT_DATE)
    );

    -- Index pour les recherches fréquentes
    CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

    -- Table pour les plages de disponibilité des médecins
    CREATE TABLE IF NOT EXISTS doctor_availability (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER NOT NULL,
        available_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_booked BOOLEAN DEFAULT false,
        appointment_id INTEGER REFERENCES appointments(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(doctor_id, available_date, start_time)
    );

    -- Table pour les types de consultation
    CREATE TABLE IF NOT EXISTS consultation_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true
    );

    -- Table pour l'historique des modifications
    CREATE TABLE IF NOT EXISTS appointment_history (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
        previous_status appointment_status,
        new_status appointment_status,
        changed_by INTEGER NOT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason TEXT
    );

    -- Trigger pour mettre à jour updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_appointments_updated_at
        BEFORE UPDATE ON appointments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Insérer les types de consultation par défaut
    INSERT INTO consultation_types (name, duration_minutes, description) VALUES
        ('Consultation standard', 30, 'Consultation médicale standard'),
        ('Consultation longue', 45, 'Consultation pour suivi approfondi'),
        ('Urgence', 20, 'Consultation urgente'),
        ('Téléconsultation', 20, 'Consultation à distance')
    ON CONFLICT DO NOTHING;
  `;

  try {
    await pool.query(createAppointmentTables);
    console.log('✅ Tables rendez-vous créées avec succès');
  } catch (error) {
    console.error('❌ Erreur création tables rendez-vous:', error);
  }
};

setTimeout(createTables, 2000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};