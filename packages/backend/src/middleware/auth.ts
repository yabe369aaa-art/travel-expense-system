import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getEnv } from '../config/env.js';
import { JWTPayload } from '../types/auth.js';

// @fastify/jwt で追加される user プロパティの型拡張
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JWTPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: JWTPayload['role'][]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(request, reply);
    if (reply.sent) return;
    
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
  };
}

export function requireOwnershipOrRole(
  getResourceUserId: (request: FastifyRequest) => Promise<string>,
  ...allowedRoles: JWTPayload['role'][]
) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await authenticate(request, reply);
    if (reply.sent) return;
    
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    if (allowedRoles.includes(request.user.role)) {
      return;
    }
    
    const resourceUserId = await getResourceUserId(request);
    if (request.user.id !== resourceUserId) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Not owner of this resource' });
    }
  };
}

export function optionalAuth() {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await request.jwtVerify();
    } catch {
      // Ignore - user remains undefined
    }
  };
}

export function generateTokens(user: JWTPayload, fastify: FastifyInstance) {
  const env = getEnv();
  const accessToken = fastify.jwt.sign(
    { ...user },
    { expiresIn: env.JWT_EXPIRES_IN }
  );
  const refreshToken = fastify.jwt.sign(
    { ...user, type: 'refresh' },
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string, fastify: FastifyInstance): JWTPayload | null {
  try {
    return fastify.jwt.verify<JWTPayload>(token);
  } catch {
    return null;
  }
}