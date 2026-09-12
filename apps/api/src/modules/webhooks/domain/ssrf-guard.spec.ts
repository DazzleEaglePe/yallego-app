import { describe, expect, it } from 'vitest';

import { isPrivateOrReservedIp } from './ssrf-guard';

describe('isPrivateOrReservedIp', () => {
  it('rejects IPv4 loopback, private, non-routable and reserved ranges', () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true); // metadata de nube
    expect(isPrivateOrReservedIp('100.64.0.1')).toBe(true); // CGNAT
    expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);
    expect(isPrivateOrReservedIp('192.0.2.1')).toBe(true); // documentación
    expect(isPrivateOrReservedIp('198.18.0.1')).toBe(true); // benchmark
    expect(isPrivateOrReservedIp('224.0.0.1')).toBe(true); // multicast
    expect(isPrivateOrReservedIp('255.255.255.255')).toBe(true); // reservado/broadcast
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

  it('rejects IPv6 non-public ranges and every private IPv4-mapped representation', () => {
    expect(isPrivateOrReservedIp('::')).toBe(true);
    expect(isPrivateOrReservedIp('::1')).toBe(true);
    expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
    expect(isPrivateOrReservedIp('fd12:3456::1')).toBe(true);
    expect(isPrivateOrReservedIp('fe80::1')).toBe(true);
    expect(isPrivateOrReservedIp('febf::1')).toBe(true);
    expect(isPrivateOrReservedIp('ff02::1')).toBe(true);
    expect(isPrivateOrReservedIp('2001:db8::1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:7f00:1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:192.168.1.1')).toBe(true);
  });

  it('accepts a public IPv6 address', () => {
    expect(isPrivateOrReservedIp('2001:4860:4860::8888')).toBe(false);
  });

  it('rejects anything that is not a recognizable IP', () => {
    expect(isPrivateOrReservedIp('not-an-ip')).toBe(true);
    expect(isPrivateOrReservedIp('')).toBe(true);
  });
});
