import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FileService } from '../services/file.service.js';
import { authenticate } from '../middleware/auth.js';
import { presignedUrlSchema } from '../schemas/index.js';

type PresignedUrl = z.infer<typeof presignedUrlSchema>;

interface ParamsFileKey { fileKey: string; }

export async function fileRoutes(fastify: FastifyInstance) {
  const fileService = new FileService();

  fastify.post('/presigned-url', { 
    preHandler: authenticate,
    schema: { body: presignedUrlSchema },
  }, async (request, reply) => {
    const body = request.body as PresignedUrl;
    const result = await fileService.getPresignedUploadUrl(
      body.fileName,
      body.contentType,
      body.fileSize
    );
    return reply.send(result);
  });

  fastify.get('/view/:fileKey', { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as ParamsFileKey;
    const url = await fileService.getPresignedViewUrl(params.fileKey);
    return reply.send({ url });
  });

  fastify.delete('/:fileKey', { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as ParamsFileKey;
    await fileService.deleteFile(params.fileKey);
    return reply.code(204).send();
  });
}