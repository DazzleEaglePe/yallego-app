import { describe, expect, it } from 'vitest';

import { isIpAllowed } from './ip-allowlist';

describe('isIpAllowed', () => {
  it('matches an exact IPv4 address', () => {
    expect(isIpAllowed('203.0.113.5', ['203.0.113.5'])).toBe(true);
    expect(isIpAllowed('203.0.113.6', ['203.0.113.5'])).toBe(false);
  });

  it('matches an IPv4 CIDR range', () => {
    const allowlist = ['10.0.0.0/24'];
    expect(isIpAllowed('10.0.0.1', allowlist)).toBe(true);
    expect(isIpAllowed('10.0.0.254', allowlist)).toBe(true);
    expect(isIpAllowed('10.0.1.1', allowlist)).toBe(false);
  });

  it('handles a /32 CIDR as an exact match', () => {
    expect(isIpAllowed('10.0.0.1', ['10.0.0.1/32'])).toBe(true);
    expect(isIpAllowed('10.0.0.2', ['10.0.0.1/32'])).toBe(false);
  });

  it('handles a /0 CIDR as matching everything', () => {
    expect(isIpAllowed('8.8.8.8', ['0.0.0.0/0'])).toBe(true);
  });

  it('normalizes an IPv4-mapped IPv6 address before comparing', () => {
    expect(isIpAllowed('::ffff:203.0.113.5', ['203.0.113.5'])).toBe(true);
    expect(isIpAllowed('203.0.113.5', ['::ffff:203.0.113.5'])).toBe(true);
  });

  it('matches an exact IPv6 address', () => {
    expect(isIpAllowed('::1', ['::1'])).toBe(true);
    expect(isIpAllowed('::2', ['::1'])).toBe(false);
  });

  it('checks multiple allowlist entries', () => {
    const allowlist = ['203.0.113.5', '10.0.0.0/8', '::1'];
    expect(isIpAllowed('10.5.5.5', allowlist)).toBe(true);
    expect(isIpAllowed('::1', allowlist)).toBe(true);
    expect(isIpAllowed('192.168.1.1', allowlist)).toBe(false);
  });

  it('denies everything when the allowlist is empty', () => {
    expect(isIpAllowed('203.0.113.5', [])).toBe(false);
  });

  it('ignores blank entries without matching everything', () => {
    expect(isIpAllowed('203.0.113.5', ['', '  '])).toBe(false);
  });
});
