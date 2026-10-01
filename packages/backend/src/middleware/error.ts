import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { getEnv } from '../config/env.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, 'NOT_FOUND', `${resource}${id ? ` (${id})` : ''} not found`);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const env = getEnv();
  const isDev = env.NODE_ENV === 'development';

  request.log.error({ err: error }, 'Request error');

  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.code,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      return reply.code(409).send({
        error: 'CONFLICT',
        message: `Duplicate value for ${target}`,
      });
    }
    if (error.code === 'P2025') {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Record not found',
      });
    }
  }

  if (error.validation) {
    return reply.code(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: error.validation,
    });
  }

  const statusCode = error.statusCode || 500;
  const message = isDev ? error.message : 'Internal Server Error';

  return reply.code(statusCode).send({
    error: 'INTERNAL_ERROR',
    message,
    ...(isDev && { stack: error.stack }),
  });
}

export function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  reply.code(404).send({
    error: 'NOT_FOUND',
    message: `Route ${request.method} ${request.url} not found`,
  });
}