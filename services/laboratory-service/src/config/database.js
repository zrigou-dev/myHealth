const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔄 Configuration PostgreSQL laboratoire:');
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
  console.log('✅ Connecté à PostgreSQL laboratoire');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL laboratoire:', err);
});

const createTables = async () => {
  console.log('🔄 Création des tables laboratoire...');

  try {
    await pool.query(`
      -- =========================
      -- ENUM TYPES
      -- =========================

      DO $$ BEGIN
        CREATE TYPE test_status AS ENUM ('pending','in_progress','completed','cancelled','validated');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE sample_type AS ENUM ('blood','urine','stool','tissue','saliva','other');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE result_flag AS ENUM ('normal','low','high','critical_low','critical_high','abnormal');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      -- =========================
      -- TABLES
      -- =========================

      CREATE TABLE IF NOT EXISTS lab_tests (
        id SERIAL PRIMARY KEY,
        test_code VARCHAR(50) UNIQUE NOT NULL,
        test_name VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        sample_type sample_type NOT NULL,
        preparation_instructions TEXT,
        default_unit VARCHAR(20),
        reference_ranges JSONB,
        turnaround_hours INTEGER DEFAULT 24,
        price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lab_requests (
        id SERIAL PRIMARY KEY,
        request_number VARCHAR(50) UNIQUE,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_id INTEGER,
        request_date DATE DEFAULT CURRENT_DATE,
        priority VARCHAR(20) DEFAULT 'routine',
        status test_status DEFAULT 'pending',
        clinical_info TEXT,
        diagnosis TEXT,
        notes TEXT,
        requested_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS request_tests (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES lab_requests(id) ON DELETE CASCADE,
        test_id INTEGER REFERENCES lab_tests(id),
        test_name VARCHAR(200),
        test_code VARCHAR(50),
        sample_id VARCHAR(100),
        sample_collected_at TIMESTAMP,
        sample_collected_by VARCHAR(100),
        status test_status DEFAULT 'pending',
        urgency VARCHAR(20) DEFAULT 'routine',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS lab_results (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES lab_requests(id) ON DELETE CASCADE,
        request_test_id INTEGER REFERENCES request_tests(id) ON DELETE CASCADE,
        test_id INTEGER REFERENCES lab_tests(id),
        patient_id INTEGER NOT NULL,
        result_value DECIMAL(10,2),
        result_text TEXT,
        unit VARCHAR(20),
        reference_range_min DECIMAL(10,2),
        reference_range_max DECIMAL(10,2),
        flag result_flag,
        is_abnormal BOOLEAN DEFAULT false,
        performed_by VARCHAR(100),
        performed_at TIMESTAMP,
        validated_by VARCHAR(100),
        validated_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- =========================
      -- INDEX
      -- =========================

      CREATE INDEX IF NOT EXISTS idx_lab_tests_code ON lab_tests(test_code);
      CREATE INDEX IF NOT EXISTS idx_lab_tests_category ON lab_tests(category);

      -- =========================
      -- UPDATED_AT FUNCTION
      -- =========================

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- =========================
      -- SAFE TRIGGERS
      -- =========================

      DROP TRIGGER IF EXISTS update_lab_tests_updated_at ON lab_tests;
      CREATE TRIGGER update_lab_tests_updated_at
        BEFORE UPDATE ON lab_tests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_lab_requests_updated_at ON lab_requests;
      CREATE TRIGGER update_lab_requests_updated_at
        BEFORE UPDATE ON lab_requests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_lab_results_updated_at ON lab_results;
      CREATE TRIGGER update_lab_results_updated_at
        BEFORE UPDATE ON lab_results
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- =========================
      -- GENERATE REQUEST NUMBER
      -- =========================

      CREATE OR REPLACE FUNCTION generate_request_number()
      RETURNS TRIGGER AS $$
      DECLARE
        year_prefix TEXT;
        next_number INTEGER;
      BEGIN
        year_prefix := to_char(NEW.request_date, 'YYYY');

        SELECT COALESCE(MAX(
          CAST(SUBSTRING(request_number FROM 'LAB-' || year_prefix || '-([0-9]+)') AS INTEGER)
        ), 0) + 1
        INTO next_number
        FROM lab_requests
        WHERE request_number LIKE 'LAB-' || year_prefix || '-%';

        NEW.request_number := 'LAB-' || year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_generate_request_number ON lab_requests;
      CREATE TRIGGER trg_generate_request_number
        BEFORE INSERT ON lab_requests
        FOR EACH ROW
        WHEN (NEW.request_number IS NULL)
        EXECUTE FUNCTION generate_request_number();
    `);

    console.log('✅ Tables laboratoire prêtes');
    await insertDefaultLabTests();

  } catch (error) {
    console.error('❌ Erreur création tables laboratoire:', error);
  }
};

async function insertDefaultLabTests() {
  await pool.query(`
    INSERT INTO lab_tests (test_code, test_name, category, sample_type, turnaround_hours)
    VALUES
      ('CBC','Numération formule sanguine (NFS)','Hematology','blood',4),
      ('GLU','Glycémie à jeun','Biochemistry','blood',2),
      ('LIPID','Bilan lipidique','Biochemistry','blood',6),
      ('URINE','Analyse d''urine','Urinalysis','urine',3),
      ('TSH','TSH (Thyroid Stimulating Hormone)','Endocrinology','blood',8)
    ON CONFLICT (test_code) DO NOTHING;
  `);

  console.log('✅ Analyses par défaut insérées');
}

setTimeout(createTables, 2000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};