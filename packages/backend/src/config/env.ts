import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  S3_ENDPOINT: z.string().url().default('http://localhost:4566'),
  S3_REGION: z.string().default('ap-northeast-1'),
  S3_ACCESS_KEY: z.string().default('test'),
  S3_SECRET_KEY: z.string().default('test'),
  S3_BUCKET: z.string().default('travel-expense-receipts'),
  S3_PRESIGNED_EXPIRES: z.coerce.number().default(300),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  EKISPERT_API_KEY: z.string().optional(),
  GASOLINE_UNIT_PRICE: z.coerce.number().default(15),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@travel-expense.local'),
  ENTRA_CLIENT_ID: z.string().optional(),
  ENTRA_CLIENT_SECRET: z.string().optional(),
  ENTRA_TENANT_ID: z.string().optional(),
  ENTRA_REDIRECT_URI: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  cachedEnv = result.data;
  return cachedEnv;
}