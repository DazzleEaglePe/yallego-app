/**
 * Aprovisiona un administrador de plataforma (docs/07_SEGURIDAD_AUTH.md §11).
 * Deliberadamente NO hay una API pública para esto: un administrador solo
 * puede crearse desde una máquina con acceso directo a la base de datos.
 *
 * Uso:
 *   pnpm --filter @yallego/api platform:create-admin -- \
 *     --email=ops@yallego.app --name="Nombre Apellido" [--password=algo-largo]
 *
 * Sin `--password`, se genera una aleatoria y se imprime una sola vez. El
 * secreto TOTP y su URI `otpauth://` también se imprimen una sola vez —
 * cárgalos en una app de autenticación (Google Authenticator, 1Password,
 * etc.) antes de cerrar la terminal, no quedan recuperables después.
 */
import { createCipheriv, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

import { buildOtpAuthUri, generateTotpSecret } from '../src/modules/platform-auth/totp';

// Se asume invocación vía `pnpm --filter @yallego/api platform:create-admin`
// (cwd = apps/api), igual que `prisma.config.ts` asume para su propio `../../.env`.
const rootEnvFile = resolve(process.cwd(), '../../.env');
if (!process.env.DATABASE_URL && existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}
if (process.env.DIRECT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

// Mismo formato que `EncryptionService` (infrastructure/crypto/encryption.service.ts):
// iv(12) || authTag(16) || ciphertext, AES-256-GCM. Se duplica aquí en vez de
// instanciar el servicio de Nest porque este script corre fuera del
// contenedor de inyección de dependencias.
function encrypt(plainText: string, keyBase64: string): Uint8Array<ArrayBuffer> {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY debe decodificar a 32 bytes.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  // Ver el comentario equivalente en `EncryptionService.encrypt`: el buffer
  // recién ensamblado siempre respalda un `ArrayBuffer` propio.
  return Uint8Array.from(
    Buffer.concat([iv, cipher.getAuthTag(), ciphertext]),
  ) as Uint8Array<ArrayBuffer>;
}

function parseArgs(): { email: string; name: string; password?: string } {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key, rest.join('=')];
    }),
  );

  const email = args.get('email');
  const name = args.get('name');
  if (!email || !name) {
    throw new Error('Uso: --email=<correo> --name="<nombre completo>" [--password=<clave>]');
  }
  return { email, name, password: args.get('password') };
}

async function main(): Promise<void> {
  const { email, name, password: providedPassword } = parseArgs();
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY no está configurada.');

  const password = providedPassword ?? randomBytes(18).toString('base64url');
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 4,
    hashLength: 32,
  });

  const { secret, base32 } = generateTotpSecret();
  const totpSecretEncrypted = encrypt(secret.toString('base64'), encryptionKey);

  const prisma = new PrismaClient();
  try {
    const admin = await prisma.platformAdmin.create({
      data: { email, fullName: name, passwordHash, totpSecret: totpSecretEncrypted },
    });

    const otpAuthUri = buildOtpAuthUri({
      secretBase32: base32,
      accountEmail: email,
      issuer: 'Yallego Platform',
    });

    console.log(`\nAdministrador de plataforma creado: ${admin.id}`);
    if (!providedPassword) console.log(`Contraseña (única vez): ${password}`);
    console.log(`Secreto TOTP (base32, única vez): ${base32}`);
    console.log(`URI para escanear: ${otpAuthUri}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
