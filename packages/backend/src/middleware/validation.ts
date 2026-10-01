import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      if (schema.body) {
        request.body = schema.body.parse(request.body);
      }
      if (schema.query) {
        request.query = schema.query.parse(request.query);
      }
      if (schema.params) {
        request.params = schema.params.parse(request.params);
      }
      if (schema.headers) {
        request.headers = schema.headers.parse(request.headers);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      throw err;
    }
  };
}

export function serializer(schema: ZodSchema) {
  return function (request: FastifyRequest, reply: FastifyReply, payload: unknown): unknown {
    return schema.parse(payload);
  };
}