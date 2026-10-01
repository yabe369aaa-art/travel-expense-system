import { prisma } from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { getEnv } from '../config/env.js';
import { AppError, NotFoundError, ConflictError, UnauthorizedError } from '../middleware/error.js';
import { JWTPayload, MfaSession, TokenPair } from '../types/auth.js';
import { FastifyInstance } from 'fastify';

const mfaSessions = new Map<string, MfaSession>();

export class AuthService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async registerLocal(
    email: string,
    password: string,
    role: JWTPayload['role'] = 'applicant'
  ): Promise<{ user: JWTPayload; tokens: TokenPair }> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await this.hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, role, authType: 'local' },
    });

    const payload = this.toPayload(user);
    const tokens = this.generateTokens(payload);
    return { user: payload, tokens };
  }

  async loginLocal(email: string, password: string): Promise<{ user: JWTPayload; tokens: TokenPair; mfaRequired: boolean }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.authType !== 'local' || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await this.verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const payload = this.toPayload(user);
    const tokens = this.generateTokens(payload);
    
    // For demo, always require MFA for local auth
    // In production, check user.mfaEnabled flag
    return { user: payload, tokens, mfaRequired: true };
  }

  async sendMfaCode(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.authType !== 'local') {
      // Don't reveal if user exists
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    mfaSessions.set(email, { email, code, expiresAt, verified: false });

    // In production, send email via nodemailer
    // For development, log to console
    console.log(`🔐 MFA Code for ${email}: ${code}`);
  }

  async verifyMfaCode(email: string, code: string): Promise<{ user: JWTPayload; tokens: TokenPair }> {
    const session = mfaSessions.get(email);
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedError('MFA code expired or not requested');
    }
    if (session.code !== code) {
      throw new UnauthorizedError('Invalid MFA code');
    }

    session.verified = true;
    mfaSessions.set(email, session);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const payload = this.toPayload(user);
    const tokens = this.generateTokens(payload);

    mfaSessions.delete(email);
    return { user: payload, tokens };
  }

  async findOrCreateEntraUser(entraObjectId: string, email: string): Promise<{ user: JWTPayload; tokens: TokenPair }> {
    let user = await prisma.user.findUnique({ where: { entraObjectId } });
    
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        // Link existing local account to Entra ID
        user = await prisma.user.update({
          where: { id: user.id },
          data: { entraObjectId, authType: 'entra_id' },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: { email, entraObjectId, authType: 'entra_id', role: 'applicant' },
        });
      }
    }

    const payload = this.toPayload(user);
    const tokens = this.generateTokens(payload);
    return { user: payload, tokens };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const payload = this.fastify.jwt.verify<JWTPayload>(refreshToken);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const newPayload = this.toPayload(user);
    return this.generateTokens(newPayload);
  }

  async getUserById(id: string): Promise<JWTPayload | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.toPayload(user) : null;
  }

  private toPayload(user: { id: string; email: string; role: string; authType: string; entraObjectId: string | null }): JWTPayload {
    return {
      id: user.id,
      email: user.email,
      role: user.role as JWTPayload['role'],
      authType: user.authType as JWTPayload['authType'],
      entraObjectId: user.entraObjectId || undefined,
    };
  }

  private generateTokens(payload: JWTPayload): TokenPair {
    const env = getEnv();
    const accessToken = this.fastify.jwt.sign(
      { ...payload },
      { expiresIn: env.JWT_EXPIRES_IN }
    );
    const refreshToken = this.fastify.jwt.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );
    return { accessToken, refreshToken };
  }
}