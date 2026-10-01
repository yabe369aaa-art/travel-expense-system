import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { loginSchema, sendMfaSchema, verifyMfaSchema, refreshTokenSchema, createUserSchema, updateUserSchema } from '../schemas/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);

  fastify.post('/login', {
    schema: { body: loginSchema },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const { user, tokens, mfaRequired } = await authService.loginLocal(email, password);
    
    if (mfaRequired) {
      return reply.send({ user, tokens, mfaRequired: true });
    }
    return reply.send({ user, tokens, mfaRequired: false });
  });

  fastify.post('/mfa/send', {
    schema: { body: sendMfaSchema },
  }, async (request, reply) => {
    const { email } = request.body as { email: string };
    await authService.sendMfaCode(email);
    return reply.send({ message: 'MFA code sent' });
  });

  fastify.post('/mfa/verify', {
    schema: { body: verifyMfaSchema },
  }, async (request, reply) => {
    const { email, code } = request.body as { email: string; code: string };
    const { user, tokens } = await authService.verifyMfaCode(email, code);
    return reply.send({ user, tokens });
  });

  fastify.post('/refresh', {
    schema: { body: refreshTokenSchema },
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    const payload = fastify.jwt.verify<{ id: string; type: string }>(refreshToken);
    if (payload.type !== 'refresh') throw new AppError(401, 'UNAUTHORIZED', 'Invalid token type');
    
    const user = await authService.getUserById(payload.id);
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    
    const tokens = fastify.generateTokens(user, fastify);
    return reply.send({ user, tokens });
  });

  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ user: request.user });
  });

  fastify.get('/entra_id', async (request, reply) => {
    const mockOidcUrl = process.env.MOCK_OIDC_URL || 'http://localhost:3000';
    const clientId = process.env.ENTRA_CLIENT_ID || 'travel-expense-client';
    const redirectUri = process.env.ENTRA_REDIRECT_URI || 'http://localhost:5173/auth/callback/entra_id';
    const authUrl = `${mockOidcUrl}/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email`;
    return reply.redirect(authUrl);
  });

  fastify.get('/callback/entra_id', async (request, reply) => {
    const { code } = request.query as { code: string };
    if (!code) throw new AppError(400, 'VALIDATION_ERROR', 'Missing authorization code');

    const mockOidcUrl = process.env.MOCK_OIDC_URL || 'http://localhost:3000';
    const tokenResponse = await fetch(`${mockOidcUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.ENTRA_CLIENT_ID || 'travel-expense-client',
        client_secret: process.env.ENTRA_CLIENT_SECRET || 'travel-expense-secret',
        redirect_uri: process.env.ENTRA_REDIRECT_URI || 'http://localhost:5173/auth/callback/entra_id',
      }),
    });

    if (!tokenResponse.ok) throw new AppError(401, 'UNAUTHORIZED', 'Token exchange failed');
    
    const tokens = await tokenResponse.json() as { id_token: string; access_token: string };
    
    const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
    const entraObjectId = payload.sub || payload.oid;
    const email = payload.email || payload.preferred_username;

    const { user, tokens: appTokens } = await authService.findOrCreateEntraUser(entraObjectId, email);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return reply.redirect(`${frontendUrl}/auth/callback?accessToken=${appTokens.accessToken}&refreshToken=${appTokens.refreshToken}`);
  });

  fastify.get('/users', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    return reply.send({ items: [], total: 0, page: 1, limit: 20 });
  });

  fastify.post('/users', { 
    preHandler: [authenticate, requireRole('admin')],
    schema: { body: createUserSchema },
  }, async (request, reply) => {
    return reply.code(201).send({ message: 'Not implemented' });
  });

  fastify.patch('/users/:id', { 
    preHandler: authenticate,
    schema: { body: updateUserSchema },
  }, async (request, reply) => {
    return reply.send({ message: 'Not implemented' });
  });
}