import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import type { Environment } from '../../config/env.schema';

@Injectable()
export class MailerService {
  private readonly transporter: Transporter;

  constructor(@Inject(ConfigService) private readonly config: ConfigService<Environment, true>) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: false,
    });
  }

  async sendVerificationEmail(input: {
    email: string;
    fullName: string;
    token: string;
  }): Promise<void> {
    const url = `${this.config.get('DASHBOARD_URL', { infer: true })}/verificar-correo#token=${encodeURIComponent(input.token)}`;

    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: 'Verifica tu correo en Yallegó',
      text: `Hola ${input.fullName}. Verifica tu correo abriendo este enlace: ${url}`,
      html: `<p>Hola ${escapeHtml(input.fullName)},</p><p>Verifica tu correo para activar tu cuenta de Yallegó:</p><p><a href="${url}">Verificar mi correo</a></p><p>Este enlace vence en 24 horas.</p>`,
    });
  }

  async sendPasswordResetEmail(input: {
    email: string;
    fullName: string;
    token: string;
  }): Promise<void> {
    const url = `${this.config.get('DASHBOARD_URL', { infer: true })}/restablecer-clave#token=${encodeURIComponent(input.token)}`;

    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: 'Restablece tu contraseña de Yallegó',
      text: `Hola ${input.fullName}. Restablece tu contraseña abriendo este enlace: ${url}`,
      html: `<p>Hola ${escapeHtml(input.fullName)},</p><p>Recibimos una solicitud para restablecer tu contraseña:</p><p><a href="${url}">Crear una nueva contraseña</a></p><p>Este enlace vence en 60 minutos. Si no hiciste la solicitud, puedes ignorarlo.</p>`,
    });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character] ?? character;
  });
}
