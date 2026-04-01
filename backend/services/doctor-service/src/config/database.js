const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔄 Configuration PostgreSQL médecin:');
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
  console.log('✅ Connecté à PostgreSQL médecin');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL médecin:', err);
});

const createTables = async () => {
  console.log('🔄 Création des tables médecin...');
  
  const createDoctorTables = `
    -- Table principale des médecins
    CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL,
      license_number VARCHAR(50) UNIQUE NOT NULL,
      specialization VARCHAR(100) NOT NULL,
      sub_specializations TEXT[],
      years_experience INTEGER,
      education TEXT[],
      certifications TEXT[],
      languages_spoken TEXT[] DEFAULT ARRAY['Français'],
      consultation_fee DECIMAL(10,2),
      accepts_new_patients BOOLEAN DEFAULT true,
      bio TEXT,
      profile_picture_url TEXT,
      office_address TEXT,
      office_city VARCHAR(100),
      office_postal_code VARCHAR(20),
      office_phone VARCHAR(20),
      office_email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true
    );

    -- Table des horaires de travail
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id SERIAL PRIMARY KEY,
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Lundi, 6=Dimanche
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN DEFAULT true,
      consultation_duration INTEGER DEFAULT 30, -- en minutes
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(doctor_id, day_of_week)
    );

    -- Table des congés/absences
    CREATE TABLE IF NOT EXISTS doctor_leave (
      id SERIAL PRIMARY KEY,
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason VARCHAR(200),
      is_approved BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des patients suivis par chaque médecin
    CREATE TABLE IF NOT EXISTS doctor_patients (
      id SERIAL PRIMARY KEY,
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL, -- ID du patient (du service patient)
      assigned_date DATE DEFAULT CURRENT_DATE,
      status VARCHAR(50) DEFAULT 'active', -- active, inactive, transferred
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(doctor_id, patient_id)
    );

    -- Table des disponibilités spéciales
    CREATE TABLE IF NOT EXISTS doctor_availability (
      id SERIAL PRIMARY KEY,
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      available_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_booked BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des évaluations du médecin
    CREATE TABLE IF NOT EXISTS doctor_reviews (
      id SERIAL PRIMARY KEY,
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      consultation_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(doctor_id, patient_id, consultation_date)
    );

    -- Index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
    CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
    CREATE INDEX IF NOT EXISTS idx_doctors_city ON doctors(office_city);
    CREATE INDEX IF NOT EXISTS idx_doctor_patients_doctor ON doctor_patients(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_doctor_patients_patient ON doctor_patients(patient_id);
    CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_doctor_availability_date ON doctor_availability(available_date);
  `;

  try {
    await pool.query(createDoctorTables);
    console.log('✅ Tables médecin créées avec succès');
    
    // Insérer quelques spécialités par défaut
    await pool.query(`
      INSERT INTO specializations (name) VALUES
      ('Cardiologie'),
      ('Dermatologie'),
      ('Pédiatrie'),
      ('Gynécologie'),
      ('Ophtalmologie'),
      ('ORL'),
      ('Psychiatrie'),
      ('Radiologie'),
      ('Chirurgie'),
      ('Médecine générale')
      ON CONFLICT DO NOTHING;
    `).catch(() => {}); // Ignorer si la table n'existe pas
    
  } catch (error) {
    console.error('❌ Erreur création tables médecin:', error);
  }
};

setTimeout(createTables, 2000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};