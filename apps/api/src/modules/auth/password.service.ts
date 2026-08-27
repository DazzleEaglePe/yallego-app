import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const compromisedPasswords = new Set([
  '1234567890',
  '123456789012345',
  'contraseña',
  'password123',
  'qwerty12345',
  'administrador',
  'miclave123',
  'tequiero123',
]);

@Injectable()
export class PasswordService {
  assertAllowed(password: string): void {
    if (compromisedPasswords.has(password.trim().toLocaleLowerCase('es'))) {
      throw new BadRequestException(
        'Esta contraseña aparece en listas de claves comprometidas. Elige una diferente.',
      );
    }
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4,
      hashLength: 32,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
