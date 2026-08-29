import { z } from 'zod';

const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrlList = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  z.array(z.url()).optional(),
);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    DATABASE_URL: z
      .string()
      .default('postgresql://yallego_app:yallego_app_dev@localhost:5432/yallego'),
    // Solo la usa la CLI de Prisma; la aplicación nunca abre esta conexión.
    DIRECT_DATABASE_URL: optionalString,
    REDIS_URL: z.string().default('redis://localhost:6379'),
    // Namespace de claves BullMQ. En pruebas, cada archivo fija un valor
    // único para no compartir colas con otros archivos ni con jobs
    // huérfanos de una corrida anterior interrumpida (mismo Redis real).
    BULLMQ_PREFIX: optionalString,
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
    // Orígenes adicionales del panel, separados por coma. `DASHBOARD_URL`
    // siempre se incluye; esta lista cubre previews y puertos locales alternos
    // sin abrir CORS indiscriminadamente.
    CORS_ALLOWED_ORIGINS: optionalUrlList,
    // docs/07_SEGURIDAD_AUTH.md §11: lista blanca de IPs/CIDR separadas por
    // coma para /platform/v1. Vacía o ausente = bloquea todo el acceso: es
    // la superficie de mayor privilegio, el valor por omisión es cerrado.
    PLATFORM_ALLOWED_IPS: optionalString,
    SENTRY_DSN: optionalUrl,
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),
    OTEL_EXPORTER_OTLP_ENDPOINT: optionalUrl,
    // RNF-OBS-004: por debajo de este umbral se alerta. 0.95 según lo
    // definido explícitamente en el requerimiento, no un valor inventado.
    PARSING_SUCCESS_RATE_ALERT_THRESHOLD: z.coerce.number().min(0).max(1).default(0.95),
    // Evita alertar por una billetera con muy poco volumen en la ventana
    // (p. ej. 1 de 1 fallida = 0% pero no es una señal confiable todavía).
    PARSING_ALERT_MIN_SAMPLE_SIZE: z.coerce.number().int().positive().default(20),
    // RNF-OBS-005: los docs no fijan un número — 200 trabajos en espera es
    // ya varios minutos de backlog al ritmo del plan más alto (1000/min),
    // una señal razonable de que el worker no da abasto o está caído.
    WEBHOOK_QUEUE_DEPTH_ALERT_THRESHOLD: z.coerce.number().int().positive().default(200),
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

    if (environment.LOG_LEVEL === 'debug' || environment.LOG_LEVEL === 'trace') {
      context.addIssue({
        code: 'custom',
        path: ['LOG_LEVEL'],
        message: 'LOG_LEVEL debe ser info, warn, error o fatal en producción.',
      });
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
