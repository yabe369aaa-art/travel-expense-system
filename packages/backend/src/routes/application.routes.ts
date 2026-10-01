import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationService } from '../services/application.service.js';
import { DetailService } from '../services/detail.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { 
  createApplicationSchema, 
  updateApplicationSchema, 
  submitApplicationSchema,
  rejectApplicationSchema,
  approveApplicationSchema,
  transferApplicationSchema,
  paginatedQuerySchema,
} from '../schemas/index.js';
import { AppError, ForbiddenError } from '../middleware/error.js';

type CreateApplication = z.infer<typeof createApplicationSchema>;
type UpdateApplication = z.infer<typeof updateApplicationSchema>;
type RejectApplication = z.infer<typeof rejectApplicationSchema>;
type PaginatedQuery = z.infer<typeof paginatedQuerySchema>;

interface ParamsId { id: string; }

export async function applicationRoutes(fastify: FastifyInstance) {
  const appService = new ApplicationService();
  const detailService = new DetailService();

  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as PaginatedQuery;
    const user = request.user!;
    
    const where: Record<string, unknown> = {};
    if (user.role === 'applicant') {
      where.applicantId = user.id;
    }
    
    const { page, limit, sortBy, sortOrder, ...restQuery } = query;
    
    const result = await appService.findMany({
      ...where,
      ...restQuery,
      page,
      limit,
      sortBy,
      sortOrder,
    } as Parameters<typeof appService.findMany>[0]);
    
    return reply.send(result);
  });

  fastify.post('/', { 
    preHandler: authenticate,
    schema: { body: createApplicationSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const body = request.body as CreateApplication;
    const application = await appService.create({
      applicantId: user.id,
      targetUserId: body.targetUserId,
      title: body.title,
    });
    return reply.code(201).send(application);
  });

  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as ParamsId;
    const application = await appService.findById(params.id);
    return reply.send(application);
  });

  fastify.patch('/:id', { 
    preHandler: authenticate,
    schema: { body: updateApplicationSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    const body = request.body as z.infer<typeof updateApplicationSchema>;
    const application = await appService.update(params.id, user.id, body);
    return reply.send(application);
  });

  fastify.post('/:id/submit', { 
    preHandler: authenticate,
    schema: { body: submitApplicationSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    const application = await appService.submit(params.id, user.id);
    return reply.send(application);
  });

  fastify.post('/:id/approve', { 
    preHandler: [authenticate, requireRole('admin')],
    schema: { body: approveApplicationSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    const application = await appService.approve(params.id, user.id);
    return reply.send(application);
  });

  fastify.post('/:id/reject', { 
    preHandler: [authenticate, requireRole('admin')],
    schema: { body: rejectApplicationSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    const body = request.body as RejectApplication;
    const application = await appService.reject(params.id, user.id, body.comment);
    return reply.send(application);
  });

  fastify.post('/:id/transfer', { 
    preHandler: [authenticate, requireRole('admin')],
    schema: { body: transferApplicationSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    const application = await appService.transfer(params.id, user.id);
    return reply.send(application);
  });

  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    await appService.delete(params.id, user.id);
    return reply.code(204).send();
  });

  fastify.get('/:id/transfer-assist', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const params = request.params as ParamsId;
    const application = await appService.findById(params.id);
    
    const items = application.details.map((detail, index) => ({
      label: '利用日',
      value: detail.useDate.toISOString().split('T')[0],
      copyKey: `useDate_${index}`,
      order: index * 10,
    }));

    return reply.send({
      applicationId: application.id,
      applicantName: application.applicant.email,
      targetUserName: application.targetUser.email,
      department: '',
      items,
    });
  });
}