import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

import type { Environment } from '../../config/env.schema';

export type TrialIdentityRolloutMode = 'OFF' | 'OBSERVE' | 'ENFORCE';

@Injectable()
export class TrialIdentityRolloutService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<Environment, true>) {}

  modeFor(tenantId: string): TrialIdentityRolloutMode {
    const mode = this.config.get('TRIAL_IDENTITY_ROLLOUT_MODE', { infer: true });
    if (mode === 'OFF') return 'OFF';

    const internalIds = (
      this.config.get('TRIAL_IDENTITY_INTERNAL_TENANT_IDS', { infer: true }) ?? ''
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (internalIds.includes(tenantId)) return mode;

    const percentage = this.config.get('TRIAL_IDENTITY_ROLLOUT_PERCENT', { infer: true });
    const bucket = createHash('sha256').update(tenantId).digest().readUInt32BE(0) % 100;
    return bucket < percentage ? mode : 'OFF';
  }
}
