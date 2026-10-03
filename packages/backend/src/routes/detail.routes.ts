import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DetailService } from '../services/detail.service.js';
import { GoogleMapsService } from '../services/google-maps.service.js';
import { PDFService } from '../services/pdf.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { 
  createDetailSchema, 
  updateDetailSchema, 
  bulkDuplicateSchema,
  reuseRouteSchema,
  searchHistorySchema,
} from '../schemas/index.js';
import { AppError, ForbiddenError, NotFoundError } from '../middleware/error.js';
import { prisma } from '../config/prisma.js';
import { RouteSearchService } from '../services/route-search.service.js';

type CreateDetail = z.infer<typeof createDetailSchema>;
type UpdateDetail = z.infer<typeof updateDetailSchema>;
type UpdateDetailInput = Omit<UpdateDetail, 'useDate'> & { useDate?: string };
type BulkDuplicate = z.infer<typeof bulkDuplicateSchema>;
type ReuseRoute = z.infer<typeof reuseRouteSchema>;
type SearchHistory = z.infer<typeof searchHistorySchema>;

interface ParamsId { id: string; }
interface ParamsApplicationId { applicationId: string; }

export async function detailRoutes(fastify: FastifyInstance) {
  const detailService = new DetailService();
  const routeSearchService = new RouteSearchService();
  const googleMapsService = new GoogleMapsService();
  const pdfService = new PDFService();

  fastify.get('/routes/stations', {
    preHandler: authenticate,
    schema: { querystring: z.object({ query: z.string().trim().min(1).max(100) }) },
  }, async (request, reply) => {
    const { query } = request.query as { query: string };
    return reply.send({ items: routeSearchService.searchStations(query) });
  });

  fastify.get('/routes/search', {
    preHandler: authenticate,
    schema: {
      querystring: z.object({
        departurePlace: z.string().trim().min(1).max(255),
        arrivalPlace: z.string().trim().min(1).max(255),
      }),
    },
  }, async (request, reply) => {
    const { departurePlace, arrivalPlace } = request.query as {
      departurePlace: string;
      arrivalPlace: string;
    };
    return reply.send({
      provider: 'mock',
      items: routeSearchService.searchRoutes(departurePlace, arrivalPlace),
    });
  });

  fastify.get('/application/:applicationId', { preHandler: authenticate }, async (request, reply) => {
    const params = request.params as ParamsApplicationId;
    const details = await prisma.detail.findMany({
      where: { applicationId: params.applicationId },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(details);
  });

  fastify.post('/application/:applicationId', { 
    preHandler: authenticate,
    schema: { body: createDetailSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsApplicationId;
    const body = request.body as CreateDetail;
    
    const app = await prisma.application.findUniqueOrThrow({ where: { id: params.applicationId } });
    if (app.applicantId !== user.id) throw new ForbiddenError('Not the applicant');
    if (app.status !== 'draft') throw new ForbiddenError('Cannot add details to non-draft application');

    const detail = await detailService.create(params.applicationId, {
      ...body,
      useDate: new Date(body.useDate),
    });
    return reply.code(201).send(detail);
  });

  fastify.patch('/:id', { 
    preHandler: authenticate,
    schema: { body: updateDetailSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    const body = request.body as UpdateDetailInput;
    const updateData = {
      ...body,
      useDate: body.useDate ? new Date(body.useDate) : undefined,
    };
    
    const detail = await detailService.update(params.id, user.id, updateData);
    return reply.send(detail);
  });

  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    await detailService.delete(params.id, user.id);
    return reply.code(204).send();
  });

  fastify.post('/:id/duplicate', { 
    preHandler: authenticate,
    schema: { body: z.object({ useDate: z.string().date() }) },
  }, async (request, reply) => {
    const user = request.user!;
    const params = request.params as ParamsId;
    const { useDate } = request.body as { useDate: string };
    const detail = await detailService.duplicate(params.id, user.id, new Date(useDate));
    return reply.code(201).send(detail);
  });

  fastify.post('/bulk-duplicate', { 
    preHandler: [authenticate, requireRole('coordinator', 'admin')],
    schema: { body: bulkDuplicateSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const body = request.body as BulkDuplicate;
    const useDates = body.useDates.map(d => new Date(d));
    const details = await detailService.bulkDuplicate(body.detailId, useDates, user.id);
    return reply.code(201).send(details);
  });

  fastify.get('/search/history', { 
    preHandler: authenticate,
    schema: { querystring: searchHistorySchema },
  }, async (request, reply) => {
    const query = request.query as SearchHistory;
    const result = await detailService.searchHistory(query);
    return reply.send(result);
  });

  fastify.post('/reuse', { 
    preHandler: authenticate,
    schema: { body: reuseRouteSchema },
  }, async (request, reply) => {
    const user = request.user!;
    const body = request.body as ReuseRoute;
    const result = await detailService.reuseRoute(body.sourceDetailId, new Date(body.newUseDate), user.id);
    return reply.code(201).send(result);
  });

  fastify.post('/calculate-car-fare', { 
    preHandler: authenticate,
    schema: { body: z.object({ departurePlace: z.string(), arrivalPlace: z.string() }) },
  }, async (request, reply) => {
    const body = request.body as { departurePlace: string; arrivalPlace: string };
    const result = await detailService.calculateCarFare(body.departurePlace, body.arrivalPlace);
    return reply.send(result);
  });

  fastify.get('/places/autocomplete', {
    preHandler: authenticate,
    schema: { querystring: z.object({ query: z.string().trim().min(1).max(200) }) },
  }, async (request, reply) => {
    const { query } = request.query as { query: string };
    try {
      const items = await googleMapsService.searchPlaces(query);
      return reply.send({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : '検索に失敗しました';
      return reply.code(400).send({ error: message });
    }
  });

  fastify.post('/routes/car', {
    preHandler: authenticate,
    schema: {
      body: z.object({
        originPlaceId: z.string(),
        destinationPlaceId: z.string(),
        waypointPlaceIds: z.array(z.string()).optional(),
      }),
    },
  }, async (request, reply) => {
    const body = request.body as {
      originPlaceId: string;
      destinationPlaceId: string;
      waypointPlaceIds?: string[];
    };
    try {
      const result = await googleMapsService.getFullRouteInfo(
        body.originPlaceId,
        body.destinationPlaceId,
        body.waypointPlaceIds || []
      );
      return reply.send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ルート計算に失敗しました';
      return reply.code(400).send({ error: message });
    }
  });

  fastify.get('/routes/car/static-map', {
    preHandler: authenticate,
    schema: {
      querystring: z.object({
        centerLat: z.coerce.number(),
        centerLng: z.coerce.number(),
        zoom: z.coerce.number().optional(),
        width: z.coerce.number().optional(),
        height: z.coerce.number().optional(),
        markers: z.string().optional(),
        path: z.string().optional(),
      }),
    },
  }, async (request, reply) => {
    const { centerLat, centerLng, zoom = 13, width = 800, height = 600, markers, path } = request.query as {
      centerLat: number;
      centerLng: number;
      zoom?: number;
      width?: number;
      height?: number;
      markers?: string;
      path?: string;
    };
    try {
      const markerArray = markers ? JSON.parse(markers) : [];
      const pathArray = path ? JSON.parse(path) : [];
      const mapUrl = await googleMapsService.getStaticMapUrl(
        { lat: centerLat, lng: centerLng },
        zoom,
        markerArray,
        pathArray,
        width,
        height
      );
      return reply.send({ mapUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : '地図取得に失敗しました';
      return reply.code(400).send({ error: message });
    }
  });

  fastify.post('/routes/car/pdf', {
    preHandler: authenticate,
    schema: {
      body: z.object({
        distanceKm: z.number(),
        durationMinutes: z.number(),
        fare: z.number(),
        departurePlace: z.string(),
        arrivalPlace: z.string(),
        waypoints: z.array(z.object({ name: z.string() })),
        mapImageUrl: z.string().optional(),
      }),
    },
  }, async (request, reply) => {
    const body = request.body as {
      distanceKm: number;
      durationMinutes: number;
      fare: number;
      departurePlace: string;
      arrivalPlace: string;
      waypoints: Array<{ name: string }>;
      mapImageUrl?: string;
    };
    try {
      const pdfBuffer = await pdfService.generateRouteMapPDF(body);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="route-map-${Date.now()}.pdf"`);
      return reply.send(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF生成に失敗しました';
      return reply.code(500).send({ error: message });
    }
  });
}