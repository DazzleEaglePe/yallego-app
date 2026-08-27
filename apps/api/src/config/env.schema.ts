import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    DATABASE_URL: z.string().default('postgresql://yallego:yallego_dev@localhost:5432/yallego'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_PRIVATE_KEY: optionalString,
    JWT_PUBLIC_KEY: optionalString,
    JWT_ACCESS_TTL: z.string().default('15m'),
    JWT_REFRESH_TTL: z.string().default('30d'),
    JWT_ISSUER: z.string().default('http://localhost:3001'),
    JWT_AUDIENCE: z.string().default('yallego-dashboard'),
    ENCRYPTION_KEY: optionalString,
    WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(8),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(1025),
    MAIL_FROM: z.email().default('no-reply@yallego.app'),
    STORAGE_ENDPOINT: optionalUrl,
    STORAGE_BUCKET: optionalString,
    STORAGE_ACCESS_KEY: optionalString,
    STORAGE_SECRET_KEY: optionalString,
    DASHBOARD_URL: z.url().default('http://localhost:3000'),
    SENTRY_DSN: optionalUrl,
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV !== 'production') return;

    for (const key of ['JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY', 'ENCRYPTION_KEY'] as const) {
      if (!environment[key]) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} es obligatoria en producción.`,
        });
      }
    }
  });

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Configuración inválida: ${z.prettifyError(result.error)}`);
  }

  return result.data;
}
