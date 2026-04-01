const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

console.log("🔄 Configuration PostgreSQL pharmacie:");
console.log("   HOST:", process.env.DB_HOST);
console.log("   PORT:", process.env.DB_PORT);
console.log("   DATABASE:", process.env.DB_NAME);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => {
  console.log("✅ Connecté à PostgreSQL pharmacie");
});

pool.on("error", (err) => {
  console.error("❌ Erreur PostgreSQL pharmacie:", err);
});

const createPharmacyTables = `
    -- =========================
    -- ENUM TYPES
    -- =========================
    DO $$ BEGIN
        CREATE TYPE prescription_status AS ENUM (
            'active', 'dispensed', 'partially_dispensed', 
            'cancelled', 'expired'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE medication_form AS ENUM (
            'tablet', 'capsule', 'syrup', 'injection', 
            'cream', 'ointment', 'drops', 'inhaler', 'other'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE dispensation_status AS ENUM (
            'pending', 'completed', 'cancelled'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    -- =========================
    -- MEDICATIONS TABLE
    -- =========================
    CREATE TABLE IF NOT EXISTS medications (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255),
        laboratory VARCHAR(255),
        form medication_form NOT NULL,
        strength VARCHAR(100),
        unit VARCHAR(50),
        description TEXT,
        indications TEXT,
        contraindications TEXT,
        side_effects TEXT,
        interactions TEXT,
        dosage_instructions TEXT,
        requires_prescription BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Stock
        quantity_in_stock INTEGER DEFAULT 0,
        reorder_level INTEGER DEFAULT 10,
        unit_price DECIMAL(10,2),
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT valid_stock_quantity CHECK (quantity_in_stock >= 0)
    );

    -- =========================
    -- MEDICATION BATCHES TABLE
    -- =========================
    CREATE TABLE IF NOT EXISTS medication_batches (
        id SERIAL PRIMARY KEY,
        medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        batch_number VARCHAR(100) NOT NULL,
        expiry_date DATE NOT NULL,
        quantity INTEGER NOT NULL,
        initial_quantity INTEGER,
        purchase_price DECIMAL(10,2),
        selling_price DECIMAL(10,2),
        location VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        received_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT valid_batch_quantity CHECK (quantity >= 0),
        CONSTRAINT unique_batch UNIQUE(medication_id, batch_number)
    );
    CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        prescription_number VARCHAR(50) UNIQUE,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_id INTEGER,
        
        prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
        expiry_date DATE,
        diagnosis TEXT,
        status prescription_status DEFAULT 'active',
        
        notes TEXT,
        special_instructions TEXT,
        
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================
    -- PRESCRIPTION ITEMS TABLE
    -- =========================
    CREATE TABLE IF NOT EXISTS prescription_items (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
        medication_id INTEGER,
        medication_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100) NOT NULL,
        frequency VARCHAR(100) NOT NULL,
        duration VARCHAR(50),
        quantity INTEGER NOT NULL,
        instructions TEXT,
        quantity_dispensed INTEGER DEFAULT 0,
        substitution_allowed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================
    -- DISPENSATIONS TABLE
    -- =========================
    CREATE TABLE IF NOT EXISTS dispensations (
        id SERIAL PRIMARY KEY,
        dispensation_number VARCHAR(50) UNIQUE,
        prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
        
        patient_id INTEGER NOT NULL,
        pharmacist_id INTEGER NOT NULL,
        
        dispensation_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status dispensation_status DEFAULT 'pending',
        
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================
    -- DISPENSATION ITEMS TABLE
    -- =========================
    CREATE TABLE IF NOT EXISTS dispensation_items (
        id SERIAL PRIMARY KEY,
        dispensation_id INTEGER NOT NULL REFERENCES dispensations(id) ON DELETE CASCADE,
        prescription_item_id INTEGER REFERENCES prescription_items(id),
        medication_id INTEGER,
        batch_id INTEGER REFERENCES medication_batches(id),
        medication_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        quantity_requested INTEGER,
        quantity_dispensed INTEGER,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================
    -- STOCK HISTORY TABLE
    -- =========================
    CREATE TABLE IF NOT EXISTS stock_history (
        id SERIAL PRIMARY KEY,
        medication_id INTEGER NOT NULL REFERENCES medications(id),
        quantity_change INTEGER NOT NULL,
        previous_quantity INTEGER,
        new_quantity INTEGER,
        reason VARCHAR(100),
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================
    -- STOCK ALERTS TABLE
    -- =========================
    CREATE TABLE IF NOT EXISTS stock_alerts (
        id SERIAL PRIMARY KEY,
        medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
        alert_type VARCHAR(50) NOT NULL,
        message TEXT,
        is_resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- =========================
    -- FUNCTIONS
    -- =========================
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION generate_prescription_number()
    RETURNS TRIGGER AS $$
    DECLARE
        year_prefix TEXT;
        next_number INTEGER;
    BEGIN
        year_prefix := to_char(NEW.prescription_date, 'YYYY');

        SELECT COALESCE(
            MAX(CAST(SUBSTRING(prescription_number 
            FROM 'PRE-' || year_prefix || '-([0-9]+)') AS INTEGER)), 
            0
        ) + 1
        INTO next_number
        FROM prescriptions
        WHERE prescription_number LIKE 'PRE-' || year_prefix || '-%';

        NEW.prescription_number :=
            'PRE-' || year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION generate_dispensation_number()
    RETURNS TRIGGER AS $$
    DECLARE
        year_prefix TEXT;
        next_number INTEGER;
    BEGIN
        year_prefix := to_char(NEW.dispensation_date, 'YYYY');

        SELECT COALESCE(
            MAX(CAST(SUBSTRING(dispensation_number 
            FROM 'DEL-' || year_prefix || '-([0-9]+)') AS INTEGER)), 
            0
        ) + 1
        INTO next_number
        FROM dispensations
        WHERE dispensation_number LIKE 'DEL-' || year_prefix || '-%';

        NEW.dispensation_number :=
            'DEL-' || year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- =========================
    -- TRIGGERS
    -- =========================
    DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
    CREATE TRIGGER update_medications_updated_at
        BEFORE UPDATE ON medications
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON prescriptions;
    CREATE TRIGGER update_prescriptions_updated_at
        BEFORE UPDATE ON prescriptions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_dispensations_updated_at ON dispensations;
    CREATE TRIGGER update_dispensations_updated_at
        BEFORE UPDATE ON dispensations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS trg_generate_prescription_number ON prescriptions;
    CREATE TRIGGER trg_generate_prescription_number
        BEFORE INSERT ON prescriptions
        FOR EACH ROW
        WHEN (NEW.prescription_number IS NULL)
        EXECUTE FUNCTION generate_prescription_number();

    DROP TRIGGER IF EXISTS trg_generate_dispensation_number ON dispensations;
    CREATE TRIGGER trg_generate_dispensation_number
        BEFORE INSERT ON dispensations
        FOR EACH ROW
        WHEN (NEW.dispensation_number IS NULL)
        EXECUTE FUNCTION generate_dispensation_number();

    -- =========================
    -- INDEXES
    -- =========================
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
    CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);
    CREATE INDEX IF NOT EXISTS idx_dispensations_prescription ON dispensations(prescription_id);
    CREATE INDEX IF NOT EXISTS idx_dispensations_patient ON dispensations(patient_id);
    CREATE INDEX IF NOT EXISTS idx_dispensation_items_dispensation ON dispensation_items(dispensation_id);
    CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
    CREATE INDEX IF NOT EXISTS idx_medications_code ON medications(code);
    CREATE INDEX IF NOT EXISTS idx_medication_batches_medication ON medication_batches(medication_id);
    CREATE INDEX IF NOT EXISTS idx_medication_batches_expiry ON medication_batches(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_stock_history_medication ON stock_history(medication_id);
    CREATE INDEX IF NOT EXISTS idx_stock_alerts_medication ON stock_alerts(medication_id);
`;

const createTables = async () => {
  console.log("🔄 Création des tables pharmacie...");

  try {
    await pool.query(createPharmacyTables);
    console.log("✅ Tables pharmacie créées avec succès");
  } catch (error) {
    console.error("❌ Erreur création tables pharmacie:", error);
  }
};

setTimeout(createTables, 2000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
