import { describe, expect, it } from 'vitest';

import { safeRequestPath } from './logger.module';

describe('safeRequestPath', () => {
  it('removes query-string values from the logged URL', () => {
    expect(safeRequestPath('/v1/transactions?search=PERSONA&min_amount=1')).toBe(
      '/v1/transactions',
    );
  });

  it('keeps a URL without query parameters unchanged', () => {
    expect(safeRequestPath('/internal/v1/ingest')).toBe('/internal/v1/ingest');
  });
});
