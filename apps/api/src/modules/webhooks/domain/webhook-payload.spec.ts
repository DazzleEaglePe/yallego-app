import { describe, expect, it } from 'vitest';

import { buildWebhookPayload, newEventId } from './webhook-payload';

describe('buildWebhookPayload', () => {
  it('produces the exact shape documented in docs/06_API_CONTRACT.md §9.1', () => {
    const eventId = newEventId();
    const payload = buildWebhookPayload(eventId, 'transaction.created', {
      transaction: { id: 'txn-1' },
    });

    expect(payload).toEqual({
      id: eventId,
      type: 'transaction.created',
      api_version: 'v1',
      created_at: expect.any(String),
      data: { transaction: { id: 'txn-1' } },
    });
    expect(() => new Date(payload.created_at).toISOString()).not.toThrow();
  });

  it('generates a distinct id per call', () => {
    expect(newEventId()).not.toBe(newEventId());
  });
});
