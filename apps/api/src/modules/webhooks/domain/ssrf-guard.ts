import { isIP } from 'node:net';

/**
 * docs/10_PLAN_DESARROLLO.md, Sprint 6: "prevención de solicitudes a redes
 * internas". Solo la parte pura (clasificar una IP ya resuelta); la
 * resolución DNS en sí vive en el adaptador porque es I/O.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // no es una IP reconocible: se rechaza por seguridad
}

function isPrivateIPv4(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((n) => Number.isNaN(n))) return true;
  const [a, b] = octets as [number, number, number, number];

  if (a === 127) return true; // loopback
  if (a === 10) return true; // privada
  if (a === 172 && b >= 16 && b <= 31) return true; // privada
  if (a === 192 && b === 168) return true; // privada
  if (a === 169 && b === 254) return true; // link-local, incluye metadata de nube
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1') return true; // loopback
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local (fc00::/7)
  if (normalized.startsWith('fe80')) return true; // link-local
  if (normalized.startsWith('::ffff:')) return isPrivateIPv4(normalized.slice(7)); // IPv4-mapped
  return false;
}
