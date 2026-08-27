import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Environment } from '../../config/env.schema';
import { MailerService } from './mailer.service';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail }),
  },
}));

describe('MailerService', () => {
  let service: MailerService;

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue(undefined);
    const values = {
      DASHBOARD_URL: 'https://panel.yallego.app',
      MAIL_FROM: 'no-reply@yallego.app',
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
    };
    const config = {
      get: (key: keyof typeof values) => values[key],
    } as unknown as ConfigService<Environment, true>;
    service = new MailerService(config);
  });

  it('keeps email verification tokens out of server-visible query strings', async () => {
    await service.sendVerificationEmail({
      email: 'dueno@negocio.pe',
      fullName: 'María Quispe',
      token: 'ev_token-seguro',
    });

    const message = sendMail.mock.calls[0]?.[0] as { html: string; text: string };
    expect(message.text).toContain('/verificar-correo#token=ev_token-seguro');
    expect(message.html).not.toContain('?token=');
  });

  it('keeps password reset tokens out of server-visible query strings', async () => {
    await service.sendPasswordResetEmail({
      email: 'dueno@negocio.pe',
      fullName: 'María Quispe',
      token: 'pr_token-seguro',
    });

    const message = sendMail.mock.calls[0]?.[0] as { html: string; text: string };
    expect(message.text).toContain('/restablecer-clave#token=pr_token-seguro');
    expect(message.html).not.toContain('?token=');
  });
});
