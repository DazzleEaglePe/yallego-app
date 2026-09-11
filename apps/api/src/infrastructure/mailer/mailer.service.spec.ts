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
      SMTP_PASSWORD: undefined,
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      SMTP_USER: undefined,
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

    const message = sendMail.mock.calls[0]?.[0] as {
      from: { address: string; name: string };
      headers: Record<string, string>;
      html: string;
      subject: string;
      text: string;
    };
    expect(message.text).toContain('/verificar-correo#token=ev_token-seguro');
    expect(message.html).not.toContain('?token=');
    expect(message.html).toContain('Confirmar mi correo');
    expect(message.html).toContain('Yallegó');
    expect(message.html).toContain('copia y pega esta dirección completa');
    expect(message.html).not.toContain('<a href=');
    expect(message.subject).toBe('Confirma tu correo para empezar en Yallegó');
    expect(message.from).toEqual({ address: 'no-reply@yallego.app', name: 'Yallegó' });
    expect(message.headers).toEqual({ 'X-Mailin-Track-Click': '0' });
  });

  it('keeps password reset tokens out of server-visible query strings', async () => {
    await service.sendPasswordResetEmail({
      email: 'dueno@negocio.pe',
      fullName: 'María Quispe',
      token: 'pr_token-seguro',
    });

    const message = sendMail.mock.calls[0]?.[0] as {
      headers: Record<string, string>;
      html: string;
      text: string;
    };
    expect(message.text).toContain('/restablecer-clave#token=pr_token-seguro');
    expect(message.html).not.toContain('?token=');
    expect(message.html).toContain('Crear nueva contraseña');
    expect(message.html).toContain('vence en 60 minutos');
    expect(message.headers).toEqual({ 'X-Mailin-Track-Click': '0' });
  });

  it('escapes user-controlled content in branded emails', async () => {
    await service.sendInvitationEmail({
      email: 'invitado@negocio.pe',
      inviterName: '<script>alert("x")</script>',
      businessName: 'Tienda & Asociados',
      token: 'invite_token-seguro',
    });

    const message = sendMail.mock.calls[0]?.[0] as {
      headers: Record<string, string>;
      html: string;
    };
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(message.html).toContain('Tienda &amp; Asociados');
    expect(message.headers).toEqual({ 'X-Mailin-Track-Click': '0' });
  });
});
