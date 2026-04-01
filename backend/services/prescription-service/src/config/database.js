const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

console.log("🔄 Configuration PostgreSQL prescription:");
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
  console.log("✅ Connecté à PostgreSQL prescription");
});

pool.on("error", (err) => {
  console.error("❌ Erreur PostgreSQL prescription:", err);
});

const createTables = async () => {
  console.log("🔄 Création des tables prescription...");

  const createPrescriptionTables = `
    -- Types ENUM
    DO $$ BEGIN
        CREATE TYPE prescription_status AS ENUM (
            'draft', 'active', 'sent_to_pharmacy', 'accepted', 'rejected',
            'dispensed', 'partially_dispensed', 'expired', 'cancelled', 'renewed'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE prescription_priority AS ENUM (
            'routine', 'urgent', 'stat'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    -- Table principale des prescriptions
    CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        prescription_number VARCHAR(50) UNIQUE NOT NULL,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        pharmacy_id INTEGER,
        appointment_id INTEGER,
        
        -- Dates
        prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
        expiry_date DATE NOT NULL,
        start_date DATE,
        
        -- Statut
        status prescription_status DEFAULT 'active',
        priority prescription_priority DEFAULT 'routine',
        rejection_reason TEXT,
        
        -- Informations cliniques
        diagnosis TEXT,
        clinical_notes TEXT,
        patient_instructions TEXT,
        
        -- Renouvellements
        renewals_allowed INTEGER DEFAULT 0,
        renewals_used INTEGER DEFAULT 0,
        original_prescription_id INTEGER REFERENCES prescriptions(id),
        
        -- Substances contrôlées
        has_controlled_substance BOOLEAN DEFAULT false,
        controlled_substance_id VARCHAR(50),
        
        -- Validation
        is_validated BOOLEAN DEFAULT false,
        validated_by INTEGER,
        validated_at TIMESTAMP,
        
        -- Metadata
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Contraintes
        CONSTRAINT valid_dates CHECK (expiry_date >= prescription_date)
    );

    -- Table des lignes de prescription
    CREATE TABLE IF NOT EXISTS prescription_items (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        medication_id INTEGER NOT NULL,
        medication_code VARCHAR(50),
        medication_name VARCHAR(200) NOT NULL,
        
        -- Dosage
        dosage_value DECIMAL(10,2),
        dosage_unit VARCHAR(20),
        dosage_form VARCHAR(50),
        strength VARCHAR(50),
        
        -- Fréquence
        frequency_value INTEGER,
        frequency_unit VARCHAR(20), -- 'hour', 'day', 'week', 'month'
        frequency_detail TEXT,
        
        -- Durée
        duration_value INTEGER,
        duration_unit VARCHAR(20), -- 'day', 'week', 'month'
        
        -- Quantité
        quantity INTEGER NOT NULL,
        quantity_dispensed INTEGER DEFAULT 0,
        quantity_unit VARCHAR(20),
        
        -- Instructions
        instructions TEXT,
        indications TEXT,
        
        -- Substitution
        substitution_allowed BOOLEAN DEFAULT false,
        
        -- Prix
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        
        -- Validation par pharmacien
        validated BOOLEAN DEFAULT false,
        validated_at TIMESTAMP,
        validation_notes TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Contraintes
        CONSTRAINT valid_quantity CHECK (quantity_dispensed <= quantity)
    );

    -- Table des instructions spéciales
    CREATE TABLE IF NOT EXISTS prescription_instructions (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        instruction_type VARCHAR(50), -- 'timing', 'food', 'activity', 'warning'
        instruction_text TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des diagnostics associés
    CREATE TABLE IF NOT EXISTS prescription_diagnoses (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        diagnosis_code VARCHAR(20),
        diagnosis_description TEXT,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des renouvellements
    CREATE TABLE IF NOT EXISTS prescription_renewals (
        id SERIAL PRIMARY KEY,
        original_prescription_id INTEGER REFERENCES prescriptions(id),
        new_prescription_id INTEGER REFERENCES prescriptions(id),
        renewal_date DATE NOT NULL DEFAULT CURRENT_DATE,
        renewed_by INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des validations
    CREATE TABLE IF NOT EXISTS prescription_validations (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
        validated_by INTEGER NOT NULL,
        validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        validation_notes TEXT,
        is_approved BOOLEAN DEFAULT true
    );

    -- Table des modèles d'ordonnance
    CREATE TABLE IF NOT EXISTS prescription_templates (
        id SERIAL PRIMARY KEY,
        template_name VARCHAR(100) NOT NULL,
        template_code VARCHAR(50) UNIQUE,
        doctor_id INTEGER,
        is_public BOOLEAN DEFAULT false,
        template_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des interactions médicamenteuses (cache local)
    CREATE TABLE IF NOT EXISTS prescription_interactions_cache (
        id SERIAL PRIMARY KEY,
        medication_id_1 INTEGER NOT NULL,
        medication_id_2 INTEGER NOT NULL,
        severity VARCHAR(50),
        description TEXT,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(medication_id_1, medication_id_2)
    );

    -- Index pour performances
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_expiry ON prescriptions(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_prescription_items_medication ON prescription_items(medication_id);
    CREATE INDEX IF NOT EXISTS idx_prescription_number ON prescriptions(prescription_number);

    -- Trigger pour updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- make sure we don’t try to create a trigger that already exists
    DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON prescriptions;

    CREATE TRIGGER update_prescriptions_updated_at
        BEFORE UPDATE ON prescriptions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Fonction pour générer numéro de prescription
    CREATE OR REPLACE FUNCTION generate_prescription_number()
    RETURNS TRIGGER AS $$
    DECLARE
        year_prefix TEXT;
        next_number INTEGER;
    BEGIN
        year_prefix := to_char(NEW.prescription_date, 'YYYY');
        
        SELECT COALESCE(MAX(CAST(SUBSTRING(prescription_number FROM 'PRE-' || year_prefix || '-([0-9]+)') AS INTEGER)), 0) + 1
        INTO next_number
        FROM prescriptions
        WHERE prescription_number LIKE 'PRE-' || year_prefix || '-%';
        
        NEW.prescription_number := 'PRE-' || year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_generate_prescription_number ON prescriptions;

    CREATE TRIGGER trg_generate_prescription_number
        BEFORE INSERT ON prescriptions
        FOR EACH ROW
        WHEN (NEW.prescription_number IS NULL)
        EXECUTE FUNCTION generate_prescription_number();

    -- Fonction pour vérifier les prescriptions expirées
    CREATE OR REPLACE FUNCTION check_expired_prescriptions()
    RETURNS TRIGGER AS $$
    BEGIN
        UPDATE prescriptions 
        SET status = 'expired'
        WHERE expiry_date < CURRENT_DATE 
          AND status IN ('active', 'partially_dispensed');
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- if you later add a trigger for this function, drop it first similarly
  `;

  try {
    await pool.query(createPrescriptionTables);
    // ensure validation columns exist on existing installations
    await pool.query(`
      ALTER TABLE prescription_items
      ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS validation_notes TEXT;

      ALTER TABLE prescriptions
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

      -- Update enum if needed (PostgreSQL 12+)
      ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'sent_to_pharmacy';
      ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'accepted';
      ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'rejected';
    `);
    console.log("✅ Tables prescription créées ou mises à jour avec succès");
  } catch (error) {
    console.error("❌ Erreur création tables prescription:", error);
  }
};

setTimeout(createTables, 2000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
