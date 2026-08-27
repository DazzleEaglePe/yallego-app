import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'TOKEN_EXPIRED',
  'FORBIDDEN',
  'PLAN_FEATURE_UNAVAILABLE',
  'NOT_FOUND',
  'CONFLICT',
  'DUPLICATE_RESOURCE',
  'PLAN_LIMIT_EXCEEDED',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
]);

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    request_id: z.string(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
