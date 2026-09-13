/**
 * docs/07_SEGURIDAD_AUTH.md §11: "Restricción por lista de direcciones IP
 * permitidas" — un control MUST para la superficie de mayor privilegio.
 * Soporta IPv4 exacta, CIDR IPv4, e IPv6 exacta (comparación de cadena tras
 * normalizar el prefijo IPv4-mapeado `::ffff:`).
 */
export function isIpAllowed(rawIp: string, allowlist: readonly string[]): boolean {
  const ip = normalizeIp(rawIp);

  for (const entry of allowlist) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    if (trimmed.includes('/')) {
      if (matchesCidr(ip, trimmed)) return true;
      continue;
    }

    if (normalizeIp(trimmed) === ip) return true;
  }

  return false;
}

function normalizeIp(ip: string): string {
  const trimmed = ip.trim().toLowerCase();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}

function matchesCidr(ip: string, cidr: string): boolean {
  const [rangeIp, prefixRaw] = cidr.split('/');
  if (!rangeIp || !prefixRaw) return false;

  const prefixLength = Number(prefixRaw);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(normalizeIp(rangeIp));
  if (
    ipInt === null ||
    rangeInt === null ||
    Number.isNaN(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > 32
  ) {
    return false;
  }

  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function ipv4ToInt(ip: string): number | null {
  const octets = ip.split('.');
  if (octets.length !== 4) return null;

  let result = 0;
  for (const octet of octets) {
    const value = Number(octet);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    result = (result << 8) | value;
  }
  return result >>> 0;
}
