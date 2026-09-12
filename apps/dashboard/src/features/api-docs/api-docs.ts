import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const API_GUIDES = [
  { slug: 'inicio-rapido', file: '01-inicio-rapido.md', label: 'Inicio rápido' },
  { slug: 'autenticacion', file: '02-autenticacion.md', label: 'Autenticación' },
  { slug: 'transacciones', file: '03-transacciones.md', label: 'Transacciones' },
  { slug: 'webhooks', file: '04-webhooks.md', label: 'Webhooks' },
  { slug: 'dispositivos', file: '05-dispositivos.md', label: 'Dispositivos' },
  { slug: 'eventos', file: '06-eventos.md', label: 'Eventos' },
  { slug: 'verificacion-firma', file: '07-verificacion-firma.md', label: 'Verificar firmas' },
  { slug: 'reintentos', file: '08-reintentos.md', label: 'Reintentos' },
  { slug: 'limites-tasa', file: '09-limites-tasa.md', label: 'Límites de tasa' },
] as const;

function docsRoot(): string {
  const workspaceDocs = path.resolve(process.cwd(), 'docs');
  const packageDocs = path.resolve(process.cwd(), '../../docs');
  return process.cwd().endsWith(path.join('apps', 'dashboard')) ? packageDocs : workspaceDocs;
}

export async function readApiGuide(slug?: string): Promise<string | null> {
  const file = slug ? API_GUIDES.find((guide) => guide.slug === slug)?.file : 'README.md';
  if (!file) return null;
  return readFile(path.join(docsRoot(), 'api-publica', file), 'utf8');
}

export async function readOpenApiDocument(): Promise<string> {
  return readFile(path.join(docsRoot(), 'openapi.yaml'), 'utf8');
}

export function documentationHref(href: string): string {
  if (href === '../openapi.yaml') return '/documentacion/openapi.yaml';
  const match = /^\.\/(?:\d{2}-)?(.+)\.md$/.exec(href);
  return match?.[1] ? `/documentacion/${match[1]}` : href;
}
