import { z } from 'zod';

export const authTypeSchema = z.enum(['local', 'entra_id']);
export const roleSchema = z.enum(['applicant', 'coordinator', 'admin']);
export const statusSchema = z.enum(['draft', 'pending', 'rejected', 'approved', 'transferred']);
export const transportTypeSchema = z.enum(['train', 'bus', 'plane', 'car']);
export const actionSchema = z.enum(['submit', 'reject', 'approve', 'transfer']);

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  authType: authTypeSchema,
  role: roleSchema,
  entraObjectId: z.string().nullable().optional(),
  createdAt: z.date(),
});

export const commuterPassSchema = z.object({
  userId: z.string().uuid(),
  routeText: z.string().nullable().optional(),
  teikiProfile: z.string(),
  expiredAt: z.date(),
});

export const applicationSchema = z.object({
  id: z.string().uuid(),
  applicantId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  title: z.string().min(1).max(100),
  status: statusSchema,
  totalAmount: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const detailSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  transportType: transportTypeSchema,
  useDate: z.date(),
  departurePlace: z.string().min(1).max(255),
  arrivalPlace: z.string().min(1).max(255),
  reimbursementFare: z.number().int().nonnegative(),
  routeSerializeData: z.string().nullable().optional(),
  gpsDistanceKm: z.number().nullable().optional(),
  receiptFileUrl: z.string().url().nullable().optional(),
  purpose: z.string().max(255).nullable().optional(),
  createdAt: z.date(),
});

export const historySchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  operatorId: z.string().uuid(),
  action: actionSchema,
  comment: z.string().nullable().optional(),
  createdAt: z.date(),
});

export const createApplicationSchema = z.object({
  targetUserId: z.string().uuid(),
  title: z.string().min(1).max(100),
});

export const updateApplicationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

export const createDetailSchema = z.object({
  transportType: transportTypeSchema,
  useDate: z.string().date(),
  departurePlace: z.string().min(1).max(255),
  arrivalPlace: z.string().min(1).max(255),
  reimbursementFare: z.number().int().nonnegative(),
  routeSerializeData: z.string().optional(),
  gpsDistanceKm: z.number().positive().max(999.99).optional(),
  receiptFileUrl: z.string().url().optional(),
  purpose: z.string().max(255).optional(),
});

export const updateDetailSchema = createDetailSchema.partial();

export const bulkDuplicateSchema = z.object({
  detailId: z.string().uuid(),
  useDates: z.array(z.string().date()).min(1).max(31),
});

export const reuseRouteSchema = z.object({
  sourceDetailId: z.string().uuid(),
  newUseDate: z.string().date(),
});

export const searchHistorySchema = z.object({
  departurePlace: z.string().optional(),
  arrivalPlace: z.string().optional(),
  transportType: transportTypeSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const submitApplicationSchema = z.object({});

export const rejectApplicationSchema = z.object({
  comment: z.string().min(1).max(1000),
});

export const approveApplicationSchema = z.object({});

export const transferApplicationSchema = z.object({});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const sendMfaSchema = z.object({
  email: z.string().email(),
});

export const verifyMfaSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128).optional(),
  role: roleSchema,
  authType: authTypeSchema,
  entraObjectId: z.string().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: roleSchema.optional(),
});

export const commuterPassUpdateSchema = z.object({
  routeText: z.string().max(255).optional(),
  teikiProfile: z.string().min(1),
  expiredAt: z.string().date(),
});

export const presignedUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\/(jpeg|png|pdf)$/),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
});

export const paginatedQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

export type AuthType = z.infer<typeof authTypeSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Status = z.infer<typeof statusSchema>;
export type TransportType = z.infer<typeof transportTypeSchema>;
export type Action = z.infer<typeof actionSchema>;
export type User = z.infer<typeof userSchema>;
export type CommuterPass = z.infer<typeof commuterPassSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type Detail = z.infer<typeof detailSchema>;
export type History = z.infer<typeof historySchema>;