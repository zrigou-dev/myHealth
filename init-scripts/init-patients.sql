-- init-scripts/init-patients.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: La table patients sera créée par l'application
-- Ce script est optionnel si vous voulez pré-configurer quelque chose

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_insurance ON patients(insurance_policy_number);