import { describe, expect, it } from 'vitest';

import { TrialIdentityRolloutService } from './trial-identity-rollout.service';

function createService(values: Record<string, unknown>): TrialIdentityRolloutService {
  return new TrialIdentityRolloutService({
    get: (key: string) => values[key],
  } as never);
}

describe('TrialIdentityRolloutService', () => {
  it('keeps identity checks disabled when the global mode is OFF', () => {
    const service = createService({
      TRIAL_IDENTITY_ROLLOUT_MODE: 'OFF',
      TRIAL_IDENTITY_ROLLOUT_PERCENT: 100,
      TRIAL_IDENTITY_INTERNAL_TENANT_IDS: 'tenant-internal',
    });

    expect(service.modeFor('tenant-internal')).toBe('OFF');
  });

  it('includes internal tenants before opening the public percentage', () => {
    const service = createService({
      TRIAL_IDENTITY_ROLLOUT_MODE: 'OBSERVE',
      TRIAL_IDENTITY_ROLLOUT_PERCENT: 0,
      TRIAL_IDENTITY_INTERNAL_TENANT_IDS: ' tenant-a,tenant-b ',
    });

    expect(service.modeFor('tenant-b')).toBe('OBSERVE');
    expect(service.modeFor('tenant-public')).toBe('OFF');
  });

  it('selects tenants deterministically and includes everyone at 100 percent', () => {
    const partial = createService({
      TRIAL_IDENTITY_ROLLOUT_MODE: 'ENFORCE',
      TRIAL_IDENTITY_ROLLOUT_PERCENT: 50,
      TRIAL_IDENTITY_INTERNAL_TENANT_IDS: '',
    });
    const full = createService({
      TRIAL_IDENTITY_ROLLOUT_MODE: 'ENFORCE',
      TRIAL_IDENTITY_ROLLOUT_PERCENT: 100,
      TRIAL_IDENTITY_INTERNAL_TENANT_IDS: '',
    });

    expect(partial.modeFor('tenant-stable')).toBe(partial.modeFor('tenant-stable'));
    expect(full.modeFor('tenant-any')).toBe('ENFORCE');
  });
});
