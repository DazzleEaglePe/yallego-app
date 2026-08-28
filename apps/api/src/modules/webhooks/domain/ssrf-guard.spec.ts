import { describe, expect, it } from 'vitest';

import { isPrivateOrReservedIp } from './ssrf-guard';

describe('isPrivateOrReservedIp', () => {
  it('rejects IPv4 loopback, private and link-local ranges', () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true); // metadata de nube
    expect(isPrivateOrReservedIp('100.64.0.1')).toBe(true); // CGNAT
    expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);
  });

  it('does not misclassify addresses just outside the private ranges', () => {
    expect(isPrivateOrReservedIp('172.15.255.255')).toBe(false);
    expect(isPrivateOrReservedIp('172.32.0.0')).toBe(false);
    expect(isPrivateOrReservedIp('100.63.255.255')).toBe(false);
    expect(isPrivateOrReservedIp('100.128.0.0')).toBe(false);
  });

  it('accepts a public IPv4 address', () => {
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
  });

  it('rejects IPv6 loopback, unique-local and link-local ranges, and IPv4-mapped private addresses', () => {
    expect(isPrivateOrReservedIp('::1')).toBe(true);
    expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
    expect(isPrivateOrReservedIp('fd12:3456::1')).toBe(true);
    expect(isPrivateOrReservedIp('fe80::1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
  });

  it('accepts a public IPv6 address', () => {
    expect(isPrivateOrReservedIp('2001:4860:4860::8888')).toBe(false);
  });

  it('rejects anything that is not a recognizable IP', () => {
    expect(isPrivateOrReservedIp('not-an-ip')).toBe(true);
    expect(isPrivateOrReservedIp('')).toBe(true);
  });
});
