import { prisma } from '../config/prisma.js';
import { AppError, NotFoundError, ForbiddenError, ConflictError } from '../middleware/error.js';
import { Role, AuthType } from '../schemas/index.js';
import bcrypt from 'bcryptjs';

export class UserService {
  async findById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User', id);
    return this.sanitize(user);
  }

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? this.sanitize(user) : null;
  }

  async findMany(filters: { role?: Role; page: number; limit: number }) {
    const where: Record<string, unknown> = {};
    if (filters.role) where.role = filters.role;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items: items.map(this.sanitize), total, page: filters.page, limit: filters.limit };
  }

  async create(data: { email: string; password?: string; role: Role; authType: AuthType; entraObjectId?: string }) {
    if (data.authType === 'local' && !data.password) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Password required for local auth');
    }
    if (data.authType === 'entra_id' && !data.entraObjectId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'entraObjectId required for entra_id auth');
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email already exists');

    const passwordHash = data.password ? await bcrypt.hash(data.password, 12) : null;

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        authType: data.authType,
        entraObjectId: data.entraObjectId,
      },
    });

    return this.sanitize(user);
  }

  async update(id: string, requesterId: string, data: { email?: string; role?: Role }) {
    const requester = await prisma.user.findUniqueOrThrow({ where: { id: requesterId } });
    const target = await prisma.user.findUniqueOrThrow({ where: { id } });

    if (requester.id !== id && requester.role !== 'admin') {
      throw new ForbiddenError('Cannot update other users');
    }

    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== id) throw new ConflictError('Email already in use');
    }

    const user = await prisma.user.update({ where: { id }, data });
    return this.sanitize(user);
  }

  async delete(id: string, requesterId: string) {
    const requester = await prisma.user.findUniqueOrThrow({ where: { id: requesterId } });
    if (requester.role !== 'admin') throw new ForbiddenError('Admin only');
    if (requester.id === id) throw new ForbiddenError('Cannot delete yourself');

    await prisma.user.delete({ where: { id } });
  }

  async updateCommuterPass(userId: string, data: { routeText?: string; teikiProfile: string; expiredAt: Date }) {
    return prisma.commuterPass.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async getCommuterPass(userId: string) {
    return prisma.commuterPass.findUnique({ where: { userId } });
  }

  private sanitize(user: { id: string; email: string; role: string; authType: string; entraObjectId: string | null; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      authType: user.authType as AuthType,
      entraObjectId: user.entraObjectId,
      createdAt: user.createdAt,
    };
  }
}