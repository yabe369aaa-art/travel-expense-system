import { prisma } from '../config/prisma.js';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/error.js';
import { TransportType, Status } from '../schemas/index.js';
import { getEnv } from '../config/env.js';

const env = getEnv();

export class DetailService {
  async create(applicationId: string, data: {
    transportType: TransportType;
    useDate: Date;
    departurePlace: string;
    arrivalPlace: string;
    reimbursementFare: number;
    routeSerializeData?: string;
    gpsDistanceKm?: number;
    receiptFileUrl?: string;
    purpose?: string;
  }) {
    const app = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    if (app.status !== 'draft') throw new ForbiddenError('Cannot add details to non-draft application');

    const detail = await prisma.detail.create({
      data: { applicationId, ...data },
    });

    await this.recalcApplicationTotal(applicationId);
    return detail;
  }

  async findById(id: string) {
    const detail = await prisma.detail.findUnique({ where: { id } });
    if (!detail) throw new NotFoundError('Detail', id);
    return detail;
  }

  async update(id: string, userId: string, data: Partial<{
    transportType: TransportType;
    useDate: Date;
    departurePlace: string;
    arrivalPlace: string;
    reimbursementFare: number;
    routeSerializeData: string | null;
    gpsDistanceKm: number | null;
    receiptFileUrl: string | null;
    purpose: string | null;
  }>) {
    const detail = await this.findById(id);
    const app = await prisma.application.findUniqueOrThrow({ where: { id: detail.applicationId } });
    if (app.applicantId !== userId) throw new ForbiddenError('Not the applicant');
    if (app.status !== 'draft') throw new ForbiddenError('Cannot edit non-draft application');

    const updated = await prisma.detail.update({ where: { id }, data });
    await this.recalcApplicationTotal(detail.applicationId);
    return updated;
  }

  async delete(id: string, userId: string) {
    const detail = await this.findById(id);
    const app = await prisma.application.findUniqueOrThrow({ where: { id: detail.applicationId } });
    if (app.applicantId !== userId) throw new ForbiddenError('Not the applicant');
    if (app.status !== 'draft') throw new ForbiddenError('Cannot delete from non-draft application');

    await prisma.detail.delete({ where: { id } });
    await this.recalcApplicationTotal(detail.applicationId);
  }

  async duplicate(id: string, userId: string, newUseDate: Date) {
    const source = await this.findById(id);
    const app = await prisma.application.findUniqueOrThrow({ where: { id: source.applicationId } });
    if (app.applicantId !== userId) throw new ForbiddenError('Not the applicant');
    if (app.status !== 'draft') throw new ForbiddenError('Cannot duplicate in non-draft application');

    let fare = source.reimbursementFare;
    let routeData = source.routeSerializeData;
    let distance = source.gpsDistanceKm;
    let receiptUrl = source.receiptFileUrl;

    if (source.transportType === 'plane') {
      receiptUrl = null;
    } else if (source.routeSerializeData) {
      // TODO: Call Ekispert API to recalculate fare for new date
      // For now, keep same fare
    } else if (source.gpsDistanceKm) {
      // TODO: Call Google Maps API to recalculate distance
    }

    const detail = await prisma.detail.create({
      data: {
        applicationId: source.applicationId,
        transportType: source.transportType,
        useDate: newUseDate,
        departurePlace: source.departurePlace,
        arrivalPlace: source.arrivalPlace,
        reimbursementFare: fare,
        routeSerializeData: routeData,
        gpsDistanceKm: distance,
        receiptFileUrl: receiptUrl,
        purpose: source.purpose,
      },
    });

    await this.recalcApplicationTotal(source.applicationId);
    return detail;
  }

  async bulkDuplicate(detailId: string, useDates: Date[], userId: string) {
    const results = await Promise.all(
      useDates.map(date => this.duplicate(detailId, userId, date))
    );
    return results;
  }

  async searchHistory(filters: {
    departurePlace?: string;
    arrivalPlace?: string;
    transportType?: TransportType;
    limit: number;
    offset: number;
  }) {
    const where: Record<string, unknown> = {
      application: { status: { in: ['approved', 'transferred'] } },
    };
    if (filters.departurePlace) where.departurePlace = { contains: filters.departurePlace, mode: 'insensitive' };
    if (filters.arrivalPlace) where.arrivalPlace = { contains: filters.arrivalPlace, mode: 'insensitive' };
    if (filters.transportType) where.transportType = filters.transportType;

    const [items, total] = await Promise.all([
      prisma.detail.findMany({
        where,
        include: { application: { select: { status: true } } },
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.detail.count({ where }),
    ]);

    return { items, total };
  }

  async reuseRoute(sourceDetailId: string, newUseDate: Date, userId: string) {
    const source = await this.findById(sourceDetailId);
    const sourceApp = await prisma.application.findUniqueOrThrow({ where: { id: source.applicationId } });
    
    if (!['approved', 'transferred'].includes(sourceApp.status)) {
      throw new ForbiddenError('Only approved/transferred routes can be reused');
    }

    // Check if user has access to source application
    // For now, allow any authenticated user to reuse approved routes

    let fare = 0;
    let routeData: string | null = null;
    let distance: number | null = null;
    let receiptUrl: string | null = null;

    if (source.transportType === 'plane') {
      fare = 0; // Must be entered manually
      receiptUrl = null;
    } else if (source.routeSerializeData) {
      // TODO: Call Ekispert API with source.routeSerializeData and newUseDate
      // Mock: keep same fare
      fare = source.reimbursementFare;
      routeData = source.routeSerializeData;
    } else if (source.gpsDistanceKm) {
      // TODO: Call Google Maps API
      distance = Number(source.gpsDistanceKm);
      fare = Math.round(distance * env.GASOLINE_UNIT_PRICE);
    }

    // Create new draft application or add to existing draft
    // For simplicity, create new application
    const newApp = await prisma.application.create({
      data: {
        applicantId: userId,
        targetUserId: userId,
        title: `Reused: ${source.departurePlace} → ${source.arrivalPlace}`,
        status: 'draft',
        totalAmount: 0,
      },
    });

    const detail = await prisma.detail.create({
      data: {
        applicationId: newApp.id,
        transportType: source.transportType,
        useDate: newUseDate,
        departurePlace: source.departurePlace,
        arrivalPlace: source.arrivalPlace,
        reimbursementFare: fare,
        routeSerializeData: routeData,
        gpsDistanceKm: distance,
        receiptFileUrl: receiptUrl,
        purpose: source.purpose,
      },
    });

    await this.recalcApplicationTotal(newApp.id);
    return { application: newApp, detail };
  }

  private async recalcApplicationTotal(applicationId: string) {
    const details = await prisma.detail.findMany({ where: { applicationId } });
    const total = details.reduce((sum, d) => sum + d.reimbursementFare, 0);
    await prisma.application.update({ where: { id: applicationId }, data: { totalAmount: total } });
  }

  async calculateCarFare(departurePlace: string, arrivalPlace: string): Promise<{ distance: number; fare: number }> {
    // TODO: Call Google Maps Distance Matrix API
    // Mock implementation
    const mockDistance = 10 + Math.random() * 50;
    const fare = Math.round(mockDistance * env.GASOLINE_UNIT_PRICE);
    return { distance: Math.round(mockDistance * 100) / 100, fare };
  }
}