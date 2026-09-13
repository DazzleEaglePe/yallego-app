import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy } from './middleware';

describe('dashboard content security policy', () => {
  it('restricts production scripts with a request nonce', () => {
    const policy = buildContentSecurityPolicy({
      apiUrl: 'https://api.yallego.app/v1',
      development: false,
      nonce: 'nonce-de-prueba',
      websocketUrl: 'wss://api.yallego.app',
    });

    expect(policy).toContain("script-src 'self' 'nonce-nonce-de-prueba' 'strict-dynamic'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("connect-src 'self' https://api.yallego.app wss://api.yallego.app");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('upgrade-insecure-requests');
  });

  it('permits the development runtime without upgrading local HTTP', () => {
    const policy = buildContentSecurityPolicy({
      apiUrl: 'http://localhost:3001/v1',
      development: true,
      nonce: 'nonce-local',
      websocketUrl: 'ws://localhost:3001',
    });

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("connect-src 'self' http://localhost:3001 ws://localhost:3001");
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});
