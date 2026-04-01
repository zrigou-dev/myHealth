-- init-scripts/init.sql
-- Script d'initialisation pour la base de données PostgreSQL du service d'authentification

-- Activer l'extension UUID (utile pour les IDs uniques)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer le type enum pour les rôles utilisateur
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin', 'pharmacy', 'lab');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Créer la table users si elle n'existe pas
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT false
);

-- Créer des indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger à la table users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insérer un utilisateur admin par défaut (mot de passe: admin123)
-- Le mot de passe hashé correspond à "admin123" avec bcrypt
INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
SELECT 'admin@myheart.com', '$2b$10$eICrbLYdThkiG/0nm.a74e6LGnfqG84TjZpzRdgKizEbvkxcZLFGm', 'Admin', 'User', 'admin', '+1234567890'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@myheart.com');

-- Note: Vous devrez générer un vrai hash bcrypt pour le mot de passe admin
-- Vous pouvez utiliser ce code Node.js pour générer le hash:
/*
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 10);
console.log(hash);
*/