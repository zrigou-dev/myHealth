const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to Patient PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Create tables if they don't exist
const createTables = async () => {
  const createPatientTable = `
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL,
      date_of_birth DATE,
      gender VARCHAR(10),
      blood_type VARCHAR(5),
      height DECIMAL(5,2),
      weight DECIMAL(5,2),
      emergency_contact_name VARCHAR(200),
      emergency_contact_phone VARCHAR(20),
      emergency_contact_relation VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      postal_code VARCHAR(20),
      country VARCHAR(100) DEFAULT 'France',
      insurance_provider VARCHAR(200),
      insurance_policy_number VARCHAR(100),
      insurance_expiry_date DATE,
      primary_care_physician_id INTEGER,
      allergies TEXT[],
      chronic_conditions TEXT[],
      current_medications TEXT[],
      medical_history TEXT,
      vaccinations TEXT[],
      registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS patient_contacts (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      contact_type VARCHAR(50), -- emergency, family, etc.
      full_name VARCHAR(200) NOT NULL,
      relationship VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(255),
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patient_notes (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      note_type VARCHAR(50), -- general, medical, administrative
      title VARCHAR(200),
      content TEXT,
      created_by INTEGER, -- user_id from auth service
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patient_documents (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
      document_name VARCHAR(255) NOT NULL,
      document_type VARCHAR(100),
      file_url TEXT,
      uploaded_by INTEGER,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON patient_notes(patient_id);
  `;

  const alterTableQueries = [
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS vaccinations TEXT[]',
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS height DECIMAL(5,2)',
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2)',
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(200)',
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100)',
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE',
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50)'
  ];

  try {
    await pool.query(createPatientTable);
    
    // Run migrations/alters
    for (const query of alterTableQueries) {
      try {
        await pool.query(query);
      } catch (err) {
        // Ignore errors for already existing columns if IF NOT EXISTS isn't supported or fails
        console.warn(`Migration query failed: ${query}`, err.message);
      }
    }
    
    console.log('✅ Patient database tables initialized and migrated');
  } catch (error) {
    console.error('Error creating patient tables:', error);
  }
};

createTables();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};