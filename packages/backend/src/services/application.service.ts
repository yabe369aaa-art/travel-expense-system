import { prisma } from '../config/prisma.js';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/error.js';
import { Status, Role, Action } from '../schemas/index.js';

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  draft: ['pending'],
  pending: ['approved', 'rejected'],
  rejected: ['pending'],
  approved: ['transferred'],
  transferred: [],
};

const ROLE_PERMISSIONS: Record<string, { canApprove: boolean; canTransfer: boolean; canReject: boolean }> = {
  admin: { canApprove: true, canTransfer: true, canReject: true },
  coordinator: { canApprove: false, canTransfer: false, canReject: false },
  applicant: { canApprove: false, canTransfer: false, canReject: false },
};

export class ApplicationService {
  canTransition(current: Status, next: Status, role: Role): boolean {
    if (!VALID_TRANSITIONS[current]?.includes(next)) return false;
    
    const permissions = ROLE_PERMISSIONS[role];
    if (next === 'approved' && !permissions.canApprove) return false;
    if (next === 'transferred' && !permissions.canTransfer) return false;
    if (next === 'rejected' && !permissions.canReject) return false;
    
    return true;
  }

  async create(data: { applicantId: string; targetUserId: string; title: string }) {
    return prisma.application.create({
      data: {
        applicantId: data.applicantId,
        targetUserId: data.targetUserId,
        title: data.title,
        status: 'draft',
        totalAmount: 0,
      },
    });
  }

  async findById(id: string) {
    const app = await prisma.application.findUnique({
      where: { id },
      include: {
        details: { orderBy: { createdAt: 'asc' } },
        histories: { include: { operator: true }, orderBy: { createdAt: 'desc' } },
        applicant: true,
        targetUser: true,
      },
    });
    if (!app) throw new NotFoundError('Application', id);
    return app;
  }

  async findMany(filters: {
    applicantId?: string;
    targetUserId?: string;
    status?: Status;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
  }) {
    const where: Record<string, unknown> = {};
    if (filters.applicantId) where.applicantId = filters.applicantId;
    if (filters.targetUserId) where.targetUserId = filters.targetUserId;
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          details: true,
          applicant: { select: { id: true, email: true } },
          targetUser: { select: { id: true, email: true } },
        },
        orderBy: { [filters.sortBy || 'createdAt']: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.application.count({ where }),
    ]);

    return { items, total, page: filters.page, limit: filters.limit };
  }

  async update(id: string, userId: string, data: { title?: string }) {
    const app = await this.findById(id);
    if (app.applicantId !== userId) throw new ForbiddenError('Not the applicant');
    if (app.status !== 'draft') throw new ForbiddenError('Cannot edit non-draft application');

    return prisma.application.update({ where: { id }, data });
  }

  async submit(id: string, userId: string) {
    return this.transition(id, userId, 'pending', 'submit');
  }

  async approve(id: string, userId: string) {
    return this.transition(id, userId, 'approved', 'approve');
  }

  async reject(id: string, userId: string, comment: string) {
    return this.transition(id, userId, 'rejected', 'reject', comment);
  }

  async transfer(id: string, userId: string) {
    return this.transition(id, userId, 'transferred', 'transfer');
  }

  private async transition(
    id: string,
    userId: string,
    nextStatus: Status,
    action: Action,
    comment?: string
  ) {
    const app = await this.findById(id);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!this.canTransition(app.status, nextStatus, user.role)) {
      throw new ForbiddenError(`Cannot transition from ${app.status} to ${nextStatus}`);
    }

    // For submit, only applicant can submit
    if (action === 'submit' && app.applicantId !== userId) {
      throw new ForbiddenError('Only applicant can submit');
    }

    const [updated] = await prisma.$transaction([
      prisma.application.update({
        where: { id },
        data: { status: nextStatus },
      }),
      prisma.applicationHistory.create({
        data: { applicationId: id, operatorId: userId, action, comment },
      }),
    ]);

    return updated;
  }

  async recalcTotal(id: string) {
    const details = await prisma.detail.findMany({ where: { applicationId: id } });
    const total = details.reduce((sum, d) => sum + d.reimbursementFare, 0);
    return prisma.application.update({ where: { id }, data: { totalAmount: total } });
  }

  async delete(id: string, userId: string) {
    const app = await this.findById(id);
    if (app.applicantId !== userId) throw new ForbiddenError('Not the applicant');
    if (app.status !== 'draft') throw new ForbiddenError('Cannot delete non-draft application');

    await prisma.application.delete({ where: { id } });
  }
}