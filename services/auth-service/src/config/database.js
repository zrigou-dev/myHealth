const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

// During tests we don't want to establish a real database connection.
// A simple guard allows the module to export stubs when NODE_ENV=test.
let pool;
if (process.env.NODE_ENV === "test") {
  // create minimal stubbed interface
  pool = {
    query: () => Promise.resolve({ rows: [] }),
    on: () => {},
    end: () => {},
  };
} else {
  pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test database connection
  pool.on("connect", () => {
    console.log("Connected to PostgreSQL database");
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
  });
}

// Create tables if they don't exist
const createTables = async () => {
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'patient',
      phone VARCHAR(20),
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT valid_role CHECK (role IN ('patient', 'doctor', 'admin', 'pharmacy', 'lab'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(500) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      revoked BOOLEAN DEFAULT false
    );
  `;

  try {
    await pool.query(createUserTable);
    if (process.env.NODE_ENV !== "test") {
      console.log("Database tables initialized");
    }
  } catch (error) {
    console.error("Error creating tables:", error);
  }
};

// run creation only when not running unit tests to avoid side effects
if (process.env.NODE_ENV !== "test") {
  createTables();
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
