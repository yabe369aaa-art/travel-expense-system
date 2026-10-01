import fastify from 'fastify';
import { envSchema } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authenticate } from './middleware/auth.js';
import { authRoutes } from './routes/auth.routes.js';
import { applicationRoutes } from './routes/application.routes.js';
import { detailRoutes } from './routes/detail.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { fileRoutes } from './routes/file.routes.js';
import { prisma } from './config/prisma.js';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { getEnv } from './config/env.js';
import { generateTokens } from './middleware/auth.js';

const env = getEnv();

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Decorators
app.decorate('generateTokens', generateTokens);

// Plugins
await app.register(fastifyHelmet, {
  contentSecurityPolicy: false,
});

await app.register(fastifyCors, {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

await app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: { cookieName: 'refreshToken', signed: false },
  sign: { algorithm: 'HS256' },
});

await app.register(fastifyCookie, {
  secret: env.JWT_SECRET,
  parseOptions: { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' },
});

await app.register(fastifyMultipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Swagger
await app.register(fastifySwagger, {
  openapi: {
    info: { title: 'Travel Expense API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
});

await app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
});

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(applicationRoutes, { prefix: '/api/applications' });
await app.register(detailRoutes, { prefix: '/api/details' });
await app.register(userRoutes, { prefix: '/api/users' });
await app.register(fileRoutes, { prefix: '/api/files' });

// Error handling
app.setErrorHandler(errorHandler);
app.setNotFoundHandler(notFoundHandler);

// Graceful shutdown
const shutdown = async () => {
  app.log.info('Shutting down...');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 Server running on http://localhost:${env.PORT}`);
    app.log.info(`📚 Swagger docs at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    generateTokens: typeof generateTokens;
  }
}