const db = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  static async create(userData) {
    const { email, password, first_name, last_name, role, phone } = userData;

    // Hash password using configurable rounds
    const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const salt = await bcrypt.genSalt(rounds);
    const password_hash = await bcrypt.hash(password, salt);

    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, phone, created_at
    `;

    const values = [email, password_hash, first_name, last_name, role, phone];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, role, phone, is_active, last_login, created_at
      FROM users WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async validatePassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  static async updateLastLogin(id) {
    const query =
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1";
    await db.query(query, [id]);
  }

  static async saveRefreshToken(userId, token, expiresAt) {
    const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const result = await db.query(query, [userId, token, expiresAt]);
    return result.rows[0];
  }

  static async revokeRefreshToken(token) {
    const query = "UPDATE refresh_tokens SET revoked = true WHERE token = $1";
    await db.query(query, [token]);
  }

  static async findValidRefreshToken(token) {
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE token = $1 AND revoked = false AND expires_at > CURRENT_TIMESTAMP
    `;
    const result = await db.query(query, [token]);
    return result.rows[0];
  }
}

module.exports = User;
