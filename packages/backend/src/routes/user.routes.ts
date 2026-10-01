import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserService } from '../services/user.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { commuterPassUpdateSchema, paginatedQuerySchema } from '../schemas/index.js';
import { ForbiddenError } from '../middleware/error.js';

type CommuterPassUpdate = z.infer<typeof commuterPassUpdateSchema>;
type PaginatedQuery = z.infer<typeof paginatedQuerySchema>;

interface ParamsUserId { userId: string; }
interface ParamsId { id: string; }

export async function userRoutes(fastify: FastifyInstance) {
  const userService = new UserService();

  fastify.get('/me/commuter-pass', { preHandler: authenticate }, async (request, reply) => {
    const pass = await userService.getCommuterPass(request.user!.id);
    return reply.send(pass);
  });

  fastify.put('/me/commuter-pass', { 
    preHandler: authenticate,
    schema: { body: commuterPassUpdateSchema },
  }, async (request, reply) => {
    const body = request.body as CommuterPassUpdate;
    const pass = await userService.updateCommuterPass(request.user!.id, {
      ...body,
      expiredAt: new Date(body.expiredAt),
    });
    return reply.send(pass);
  });

  fastify.get('/:userId/commuter-pass', { 
    preHandler: [authenticate, requireRole('coordinator', 'admin')] 
  }, async (request, reply) => {
    const params = request.params as ParamsUserId;
    const pass = await userService.getCommuterPass(params.userId);
    return reply.send(pass);
  });

  fastify.get('/', { 
    preHandler: [authenticate, requireRole('admin')],
    schema: { querystring: paginatedQuerySchema.extend({ role: z.enum(['applicant', 'coordinator', 'admin']).optional() }) },
  }, async (request, reply) => {
    const query = request.query as PaginatedQuery & { role?: string };
    const result = await userService.findMany({ role: query.role as any, page: query.page, limit: query.limit });
    return reply.send(result);
  });

  fastify.post('/', { 
    preHandler: [authenticate, requireRole('admin')],
    schema: { body: z.object({
      email: z.string().email(),
      password: z.string().min(8).optional(),
      role: z.enum(['applicant', 'coordinator', 'admin']),
      authType: z.enum(['local', 'entra_id']),
      entraObjectId: z.string().optional(),
    })},
  }, async (request, reply) => {
    const user = await userService.create(request.body as any);
    return reply.code(201).send(user);
  });

  fastify.patch('/:id', { 
    preHandler: [authenticate, requireRole('admin')],
    schema: { body: z.object({ email: z.string().email().optional(), role: z.enum(['applicant', 'coordinator', 'admin']).optional() }) },
  }, async (request, reply) => {
    const params = request.params as ParamsId;
    const user = await userService.update(params.id, request.user!.id, request.body as any);
    return reply.send(user);
  });

  fastify.delete('/:id', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const params = request.params as ParamsId;
    await userService.delete(params.id, request.user!.id);
    return reply.code(204).send();
  });
}