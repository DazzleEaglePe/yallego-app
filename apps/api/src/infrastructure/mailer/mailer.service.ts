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

  async sendInvitationEmail(input: {
    email: string;
    businessName: string;
    inviterName: string;
    token: string;
  }): Promise<void> {
    const url = `${this.config.get('DASHBOARD_URL', { infer: true })}/invitacion#token=${encodeURIComponent(input.token)}`;

    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: `${input.inviterName} te invitó a ${input.businessName} en Yallegó`,
      text: `${input.inviterName} te invitó a unirte a ${input.businessName} en Yallegó. Acepta la invitación abriendo este enlace: ${url}`,
      html: `<p>${escapeHtml(input.inviterName)} te invitó a unirte a <strong>${escapeHtml(input.businessName)}</strong> en Yallegó.</p><p><a href="${url}">Aceptar invitación</a></p><p>Este enlace vence en 7 días.</p>`,
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

  async sendPlanChangeEmail(input: {
    email: string;
    fullName: string;
    businessName: string;
    toPlan: string;
    effectiveAt: string;
    immediate: boolean;
  }): Promise<void> {
    const when = input.immediate
      ? 'de inmediato'
      : `al cierre del período actual (${input.effectiveAt})`;
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: `El plan de ${input.businessName} cambia a ${input.toPlan}`,
      text: `Hola ${input.fullName}. Confirmamos el pago de ${input.businessName}: el plan cambia a ${input.toPlan} ${when}.`,
      html: `<p>Hola ${escapeHtml(input.fullName)},</p><p>Confirmamos el pago de <strong>${escapeHtml(input.businessName)}</strong>: el plan cambia a <strong>${escapeHtml(input.toPlan)}</strong> ${when}.</p>`,
    });
  }

  async sendUsageThresholdEmail(input: {
    email: string;
    fullName: string;
    businessName: string;
    percentage: 80 | 100;
    limit: number;
    resetsAt: string;
  }): Promise<void> {
    const status =
      input.percentage === 100
        ? 'alcanzó el límite de transacciones de su plan este mes'
        : 'alcanzó el 80% del límite de transacciones de su plan este mes';
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: `${input.businessName} ${status}`,
      text: `Hola ${input.fullName}. ${input.businessName} ${status} (${input.limit} transacciones). El límite se renueva el ${input.resetsAt}. Considera actualizar de plan si esperas seguir recibiendo cobros a este ritmo.`,
      html: `<p>Hola ${escapeHtml(input.fullName)},</p><p><strong>${escapeHtml(input.businessName)}</strong> ${status} (${input.limit} transacciones).</p><p>El límite se renueva el ${input.resetsAt}. Considera actualizar de plan si esperas seguir recibiendo cobros a este ritmo.</p>`,
    });
  }

  async sendDeviceOfflineEmail(input: {
    email: string;
    fullName: string;
    deviceLabel: string;
    businessName: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: `${input.deviceLabel} dejó de reportar en ${input.businessName}`,
      text: `Hola ${input.fullName}. El dispositivo "${input.deviceLabel}" no envía señal hace más de 15 minutos y quedó marcado como desconectado. Revisa que tenga conexión a internet y la app abierta.`,
      html: `<p>Hola ${escapeHtml(input.fullName)},</p><p>El dispositivo <strong>${escapeHtml(input.deviceLabel)}</strong> no envía señal hace más de 15 minutos y quedó marcado como desconectado.</p><p>Revisa que tenga conexión a internet y la aplicación abierta.</p>`,
    });
  }

  async sendWebhookDisabledEmail(input: {
    email: string;
    fullName: string;
    endpointUrl: string;
    businessName: string;
    reason: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: `Un webhook de ${input.businessName} se deshabilitó automáticamente`,
      text: `Hola ${input.fullName}. El webhook "${input.endpointUrl}" se deshabilitó automáticamente (${input.reason}). Revísalo y, si corresponde, actívalo de nuevo desde el panel.`,
      html: `<p>Hola ${escapeHtml(input.fullName)},</p><p>El webhook <strong>${escapeHtml(input.endpointUrl)}</strong> se deshabilitó automáticamente (${escapeHtml(input.reason)}).</p><p>Revísalo y, si corresponde, actívalo de nuevo desde el panel.</p>`,
    });
  }

  /** RNF-OBS-004/005: alertas operativas a administradores de plataforma, no a tenants. */
  async sendPlatformAlertEmail(input: {
    email: string;
    fullName: string;
    subject: string;
    message: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: `[Yallegó] ${input.subject}`,
      text: `Hola ${input.fullName}. ${input.message}`,
      html: `<p>Hola ${escapeHtml(input.fullName)},</p><p>${escapeHtml(input.message)}</p>`,
    });
  }

  async sendDeviceRecoveredEmail(input: {
    email: string;
    fullName: string;
    deviceLabel: string;
    businessName: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to: input.email,
      subject: `${input.deviceLabel} volvió a conectarse en ${input.businessName}`,
      text: `Hola ${input.fullName}. El dispositivo "${input.deviceLabel}" volvió a enviar señal con normalidad.`,
      html: `<p>Hola ${escapeHtml(input.fullName)},</p><p>El dispositivo <strong>${escapeHtml(input.deviceLabel)}</strong> volvió a enviar señal con normalidad.</p>`,
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
