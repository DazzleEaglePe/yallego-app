import { describe, expect, it } from 'vitest';

import {
  DEVICE_OFFLINE_THRESHOLD_MS,
  DEVICE_ONLINE_THRESHOLD_MS,
  getDeviceConnectivity,
} from './device-connectivity';

describe('getDeviceConnectivity', () => {
  const nowMs = Date.UTC(2026, 8, 9, 3, 0, 0);

  it('reports online before the three-minute threshold', () => {
    const lastSeenAt = new Date(nowMs - DEVICE_ONLINE_THRESHOLD_MS + 1);
    expect(getDeviceConnectivity(lastSeenAt, nowMs)).toBe('ONLINE');
  });

  it('reports a delayed signal between three and six minutes', () => {
    expect(getDeviceConnectivity(new Date(nowMs - DEVICE_ONLINE_THRESHOLD_MS), nowMs)).toBe(
      'DEGRADED',
    );
    expect(getDeviceConnectivity(new Date(nowMs - DEVICE_OFFLINE_THRESHOLD_MS + 1), nowMs)).toBe(
      'DEGRADED',
    );
  });

  it('reports offline at six minutes or without a heartbeat', () => {
    expect(getDeviceConnectivity(new Date(nowMs - DEVICE_OFFLINE_THRESHOLD_MS), nowMs)).toBe(
      'OFFLINE',
    );
    expect(getDeviceConnectivity(null, nowMs)).toBe('OFFLINE');
  });

  it('tolerates small clock skew from a future heartbeat', () => {
    expect(getDeviceConnectivity(new Date(nowMs + 5_000), nowMs)).toBe('ONLINE');
  });
});
