import { z } from 'zod';

export const createPairingCodeSchema = z.strictObject({
  label: z.string().trim().min(2).max(120).optional(),
});

export const updateDeviceSchema = z
  .strictObject({
    label: z.string().trim().min(2).max(120).optional(),
    status: z.enum(['ACTIVE', 'PAUSED']).optional(),
  })
  .refine((value) => value.label !== undefined || value.status !== undefined, {
    message: 'Indica al menos un campo para actualizar.',
  });

const deviceMetadataSchema = z.strictObject({
  manufacturer: z.string().trim().max(64).optional(),
  model: z.string().trim().max(120).optional(),
  os_version: z.string().trim().max(32).optional(),
  app_version: z.string().trim().max(32).optional(),
});

export const pairDeviceSchema = z.strictObject({
  code: z.string().trim().min(6).max(16),
  device: deviceMetadataSchema,
});

export const deviceHeartbeatSchema = z.strictObject({
  app_version: z.string().trim().max(32).optional(),
  queue_size: z.coerce.number().int().min(0).max(1_000_000).optional(),
  permissions: z
    .strictObject({
      notification_access: z.boolean(),
      battery_optimization_disabled: z.boolean(),
    })
    .optional(),
});

export type CreatePairingCodeInput = z.infer<typeof createPairingCodeSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type PairDeviceInput = z.infer<typeof pairDeviceSchema>;
export type DeviceHeartbeatInput = z.infer<typeof deviceHeartbeatSchema>;
