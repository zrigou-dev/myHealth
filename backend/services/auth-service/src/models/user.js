const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

class User {
  static async create(userData) {
    const { email, password, first_name, last_name, role, phone } = userData;

    // Hash password
    const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const salt = await bcrypt.genSalt(rounds);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        first_name,
        last_name,
        role,
        phone
      }
    });
    return user;
  }

  static async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  static async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        is_active: true,
        last_login: true,
        created_at: true
      }
    });
  }
  
  static async findByIds(ids) {
    return prisma.user.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        is_active: true
      }
    });
  }

  static async findByRole(role) {
    return prisma.user.findMany({
      where: {
        role,
        is_active: true
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true
      }
    });
  }

  static async validatePassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  static async updateLastLogin(id) {
    await prisma.user.update({
      where: { id },
      data: { last_login: new Date() }
    });
  }

  static async saveRefreshToken(userId, token, expiresAt) {
    const refreshToken = await prisma.refreshToken.create({
      data: {
        user_id: userId,
        token: token,
        expires_at: expiresAt
      }
    });
    return refreshToken;
  }

  static async revokeRefreshToken(token) {
    await prisma.refreshToken.updateMany({
      where: { token },
      data: { revoked: true }
    });
  }

  static async findValidRefreshToken(token) {
    return prisma.refreshToken.findFirst({
      where: {
        token,
        revoked: false,
        expires_at: {
          gt: new Date()
        }
      }
    });
  }

  static async update(id, userData) {
    const { first_name, last_name, phone } = userData;
    return prisma.user.update({
      where: { id },
      data: {
        first_name,
        last_name,
        phone
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true
      }
    });
  }
}

module.exports = User;
