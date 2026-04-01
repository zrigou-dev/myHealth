const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔄 Configuration PostgreSQL facturation:');
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
  console.log('✅ Connecté à PostgreSQL facturation');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL facturation:', err);
});

const createTables = async () => {
  console.log('🔄 Création des tables facturation...');
  
  const createBillingTables = `
    -- Types ENUM
    DO $$ BEGIN
        CREATE TYPE invoice_status AS ENUM (
            'draft', 'sent', 'paid', 'partially_paid', 
            'overdue', 'cancelled', 'refunded'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM (
            'card', 'cash', 'bank_transfer', 'insurance', 'cheque'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM (
            'pending', 'completed', 'failed', 'refunded'
        );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    -- Table des factures
    CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        appointment_id INTEGER,
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        status invoice_status DEFAULT 'draft',
        
        -- Montants
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        amount_paid DECIMAL(10,2) DEFAULT 0,
        amount_due DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
        
        currency VARCHAR(3) DEFAULT 'EUR',
        
        -- Détails
        consultation_fee DECIMAL(10,2),
        procedure_fees JSONB,
        medication_fees JSONB,
        additional_charges JSONB,
        
        -- Notes
        notes TEXT,
        terms TEXT,
        
        -- Paiement
        payment_method payment_method,
        payment_details JSONB,
        paid_at TIMESTAMP,
        
        -- Metadata
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Index
        CONSTRAINT valid_amounts CHECK (total_amount >= 0)
    );

    -- Table des lignes de facture
    CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL, -- consultation, procedure, medication, etc.
        description TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        tax_percentage DECIMAL(5,2) DEFAULT 20.0,
        total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percentage/100) * (1 + tax_percentage/100)) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des paiements
    CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_uuid UUID DEFAULT gen_random_uuid(),
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        patient_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method payment_method NOT NULL,
        payment_status payment_status DEFAULT 'pending',
        transaction_id VARCHAR(255),
        stripe_payment_intent_id VARCHAR(255),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Détails du paiement
        card_last4 VARCHAR(4),
        card_brand VARCHAR(50),
        bank_name VARCHAR(100),
        cheque_number VARCHAR(50),
        
        -- Metadata
        notes TEXT,
        received_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des remboursements
    CREATE TABLE IF NOT EXISTS refunds (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        stripe_refund_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        processed_at TIMESTAMP,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des devis
    CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        quote_number VARCHAR(50) UNIQUE NOT NULL,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
        valid_until DATE NOT NULL,
        items JSONB NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected, expired
        converted_to_invoice_id INTEGER REFERENCES invoices(id),
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des assurances
    CREATE TABLE IF NOT EXISTS insurance_claims (
        id SERIAL PRIMARY KEY,
        claim_number VARCHAR(50) UNIQUE NOT NULL,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        patient_id INTEGER NOT NULL,
        insurance_provider VARCHAR(200) NOT NULL,
        policy_number VARCHAR(100),
        claim_amount DECIMAL(10,2) NOT NULL,
        approved_amount DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'submitted', -- submitted, approved, rejected, paid
        submission_date DATE,
        approval_date DATE,
        payment_date DATE,
        documents JSONB,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Index pour performances
    CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_doctor ON invoices(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_patient ON quotes(patient_id);

    -- Trigger pour updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_invoices_updated_at
        BEFORE UPDATE ON invoices
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Fonction pour générer numéro de facture
    CREATE OR REPLACE FUNCTION generate_invoice_number()
    RETURNS TRIGGER AS $$
    DECLARE
        year_prefix TEXT;
        next_number INTEGER;
    BEGIN
        year_prefix := to_char(NEW.invoice_date, 'YYYY');
        
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'FAC-' || year_prefix || '-([0-9]+)') AS INTEGER)), 0) + 1
        INTO next_number
        FROM invoices
        WHERE invoice_number LIKE 'FAC-' || year_prefix || '-%';
        
        NEW.invoice_number := 'FAC-' || year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_generate_invoice_number
        BEFORE INSERT ON invoices
        FOR EACH ROW
        WHEN (NEW.invoice_number IS NULL)
        EXECUTE FUNCTION generate_invoice_number();
  `;

  try {
    await pool.query(createBillingTables);
    console.log('✅ Tables facturation créées avec succès');
  } catch (error) {
    console.error('❌ Erreur création tables facturation:', error);
  }
};

setTimeout(createTables, 2000);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};