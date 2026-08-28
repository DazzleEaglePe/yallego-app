import { describe, expect, it } from 'vitest';

import { delayBeforeNextAttempt, MAX_DELIVERY_ATTEMPTS } from './retry-policy';

describe('delayBeforeNextAttempt', () => {
  it('matches the cumulative wait table in docs/04_ARQUITECTURA_SOFTWARE.md §5.2', () => {
    expect(delayBeforeNextAttempt(1)).toBe(1_000); // 1s
    expect(delayBeforeNextAttempt(2)).toBe(5_000); // 6s - 1s
    expect(delayBeforeNextAttempt(3)).toBe(30_000); // 36s - 6s
    expect(delayBeforeNextAttempt(4)).toBe(5 * 60_000 - 36_000); // ~5min - 36s
    expect(delayBeforeNextAttempt(5)).toBe(35 * 60_000 - 5 * 60_000); // 35min - 5min
    expect(delayBeforeNextAttempt(6)).toBe(150 * 60_000 - 35 * 60_000); // 2h30 - 35min
    expect(delayBeforeNextAttempt(7)).toBe(12 * 60 * 60_000 - 150 * 60_000); // 12h - 2h30
  });

  it('has no next attempt once the schedule is exhausted', () => {
    expect(MAX_DELIVERY_ATTEMPTS).toBe(8);
    expect(delayBeforeNextAttempt(8)).toBeNull();
    expect(delayBeforeNextAttempt(9)).toBeNull();
  });

  it('rejects an attempt number below 1', () => {
    expect(delayBeforeNextAttempt(0)).toBeNull();
    expect(delayBeforeNextAttempt(-1)).toBeNull();
  });
});
