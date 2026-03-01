const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

// Configuration PostgreSQL (données structurées)
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres_medical',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'myheart_medical_relational',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Configuration MongoDB (documents médicaux, données non structurées)
let mongoClient = null;
let mongoDb = null;

const connectMongo = async () => {
  try {
    const url = `mongodb://${process.env.DB_HOST || 'mongodb_medical'}:${process.env.DB_PORT || '27017'}`;
    mongoClient = new MongoClient(url);
    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.DB_NAME || 'myheart_medical');
    console.log('✅ Connecté à MongoDB medical');
    return mongoDb;
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error);
    throw error;
  }
};

// Initialisation PostgreSQL
pgPool.on('connect', () => {
  console.log('✅ Connecté à PostgreSQL medical (relational)');
});

pgPool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL medical:', err);
});

const createPostgresTables = async () => {
  console.log('🔄 Création des tables PostgreSQL medical...');
  
  const createTables = `
    -- Types ENUM
    DO $$ BEGIN
        CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE allergy_severity AS ENUM ('mild', 'moderate', 'severe', 'life_threatening');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    -- Table des constantes vitales
    CREATE TABLE IF NOT EXISTS vital_signs (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        recorded_by INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Constantes
        height DECIMAL(5,2), -- cm
        weight DECIMAL(5,2), -- kg
        bmi DECIMAL(4,1) GENERATED ALWAYS AS (
            CASE 
                WHEN height > 0 THEN (weight / ((height/100) * (height/100)))::DECIMAL(4,1)
                ELSE NULL 
            END
        ) STORED,
        
        systolic_bp INTEGER, -- tension systolique
        diastolic_bp INTEGER, -- tension diastolique
        heart_rate INTEGER, -- pouls
        respiratory_rate INTEGER, -- fréquence respiratoire
        temperature DECIMAL(3,1), -- température
        oxygen_saturation INTEGER, -- saturation O2
        
        -- Glycémie
        blood_glucose DECIMAL(4,1),
        
        -- Notes
        notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des allergies
    CREATE TABLE IF NOT EXISTS allergies (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        allergen VARCHAR(200) NOT NULL,
        reaction TEXT,
        severity allergy_severity DEFAULT 'moderate',
        diagnosed_date DATE,
        diagnosed_by INTEGER,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des vaccinations
    CREATE TABLE IF NOT EXISTS vaccinations (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        vaccine_name VARCHAR(200) NOT NULL,
        administration_date DATE NOT NULL,
        next_due_date DATE,
        administered_by INTEGER,
        batch_number VARCHAR(100),
        manufacturer VARCHAR(200),
        site VARCHAR(100), -- 'left arm', 'right arm', etc.
        reaction TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des antécédents médicaux
    CREATE TABLE IF NOT EXISTS medical_conditions (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        condition_name VARCHAR(200) NOT NULL,
        icd10_code VARCHAR(20), -- Code CIM-10
        diagnosed_date DATE,
        diagnosed_by INTEGER,
        is_chronic BOOLEAN DEFAULT false,
        is_resolved BOOLEAN DEFAULT false,
        resolved_date DATE,
        severity VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des traitements en cours
    CREATE TABLE IF NOT EXISTS current_treatments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        prescription_id INTEGER,
        medication_name VARCHAR(200) NOT NULL,
        dosage VARCHAR(100),
        frequency VARCHAR(100),
        start_date DATE,
        end_date DATE,
        prescribing_doctor INTEGER,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des hospitalisations
    CREATE TABLE IF NOT EXISTS hospitalizations (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL,
        admission_date TIMESTAMP NOT NULL,
        discharge_date TIMESTAMP,
        reason TEXT,
        diagnosis TEXT,
        hospital VARCHAR(200),
        department VARCHAR(100),
        attending_doctor INTEGER,
        discharge_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Index
    CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs(patient_id);
    CREATE INDEX IF NOT EXISTS idx_vital_signs_date ON vital_signs(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_allergies_patient ON allergies(patient_id);
    CREATE INDEX IF NOT EXISTS idx_vaccinations_patient ON vaccinations(patient_id);
    CREATE INDEX IF NOT EXISTS idx_conditions_patient ON medical_conditions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_treatments_patient ON current_treatments(patient_id);

    -- Trigger pour updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_allergies_updated_at
        BEFORE UPDATE ON allergies
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_conditions_updated_at
        BEFORE UPDATE ON medical_conditions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await pgPool.query(createTables);
    console.log('✅ Tables PostgreSQL medical créées avec succès');
  } catch (error) {
    console.error('❌ Erreur création tables PostgreSQL:', error);
  }
};

// Initialisation MongoDB
const initMongoDB = async () => {
  try {
    const db = await connectMongo();
    
    // Créer des collections avec validation
    await db.createCollection('medical_documents', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['patient_id', 'document_type', 'content'],
          properties: {
            patient_id: { bsonType: 'int' },
            document_type: { bsonType: 'string' },
            title: { bsonType: 'string' },
            content: { bsonType: 'object' },
            uploaded_by: { bsonType: 'int' },
            uploaded_at: { bsonType: 'date' },
            tags: { bsonType: 'array', items: { bsonType: 'string' } }
          }
        }
      }
    });

    await db.createCollection('consultation_notes', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['patient_id', 'doctor_id', 'date', 'notes'],
          properties: {
            patient_id: { bsonType: 'int' },
            doctor_id: { bsonType: 'int' },
            appointment_id: { bsonType: 'int' },
            date: { bsonType: 'date' },
            subjective: { bsonType: 'string' }, // Ce que dit le patient
            objective: { bsonType: 'string' },  // Observations
            assessment: { bsonType: 'string' }, // Diagnostic
            plan: { bsonType: 'string' },       // Plan de traitement
            prescriptions: { bsonType: 'array' },
            lab_requests: { bsonType: 'array' },
            notes: { bsonType: 'string' }
          }
        }
      }
    });

    // Créer des index
    await db.collection('medical_documents').createIndex({ patient_id: 1 });
    await db.collection('medical_documents').createIndex({ document_type: 1 });
    await db.collection('consultation_notes').createIndex({ patient_id: 1 });
    await db.collection('consultation_notes').createIndex({ doctor_id: 1 });
    await db.collection('consultation_notes').createIndex({ date: -1 });

    console.log('✅ Collections MongoDB créées avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation MongoDB:', error);
  }
};

// Initialisation
setTimeout(async () => {
  await createPostgresTables();
  await initMongoDB();
}, 2000);

module.exports = {
  pg: pgPool,
  mongo: {
    getDb: () => mongoDb,
    getClient: () => mongoClient
  },
  query: (text, params) => pgPool.query(text, params)
};