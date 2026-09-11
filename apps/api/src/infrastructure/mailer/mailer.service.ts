import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import type { Environment } from '../../config/env.schema';
import { escapeHtml, paragraph, renderEmailTemplate } from './email-template';

const DISABLE_CLICK_TRACKING_HEADERS = {
  'X-Mailin-Track-Click': '0',
} as const;

@Injectable()
export class MailerService {
  private readonly transporter: Transporter;
  private readonly from: { name: string; address: string };

  constructor(@Inject(ConfigService) private readonly config: ConfigService<Environment, true>) {
    const username = config.get('SMTP_USER', { infer: true });
    const password = config.get('SMTP_PASSWORD', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      ...(username && password ? { auth: { user: username, pass: password } } : {}),
    });
    this.from = {
      name: 'Yallegó',
      address: config.get('MAIL_FROM', { infer: true }),
    };
  }

  async sendVerificationEmail(input: {
    email: string;
    fullName: string;
    token: string;
  }): Promise<void> {
    const url = `${this.config.get('DASHBOARD_URL', { infer: true })}/verificar-correo#token=${encodeURIComponent(input.token)}`;

    await this.transporter.sendMail({
      from: this.from,
      to: input.email,
      headers: DISABLE_CLICK_TRACKING_HEADERS,
      subject: 'Confirma tu correo para empezar en Yallegó',
      text: `Hola ${input.fullName},\n\nGracias por crear tu cuenta en Yallegó. Confirma tu correo para activarla:\n${url}\n\nEste enlace vence en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.`,
      html: renderEmailTemplate({
        preheader: 'Confirma tu correo y activa tu cuenta de Yallegó.',
        title: 'Confirma tu correo',
        greeting: `Hola ${input.fullName},`,
        bodyHtml: paragraph(
          'Gracias por crear tu cuenta. Confirma tu dirección de correo para activar Yallegó y comenzar a validar tus cobros.',
        ),
        action: { label: 'Confirmar mi correo', url, clickable: false },
        notice:
          'Este enlace vence en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.',
      }),
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
      from: this.from,
      to: input.email,
      headers: DISABLE_CLICK_TRACKING_HEADERS,
      subject: `${input.inviterName} te invitó a ${input.businessName} en Yallegó`,
      text: `Hola,\n\n${input.inviterName} te invitó a unirte a ${input.businessName} en Yallegó.\nAcepta la invitación aquí:\n${url}\n\nEste enlace vence en 7 días.`,
      html: renderEmailTemplate({
        preheader: `${input.inviterName} te invitó a colaborar en ${input.businessName}.`,
        title: 'Tienes una invitación',
        greeting: 'Hola,',
        bodyHtml: paragraph(
          `<strong>${escapeHtml(input.inviterName)}</strong> te invitó a formar parte de <strong>${escapeHtml(input.businessName)}</strong> en Yallegó.`,
        ),
        action: { label: 'Aceptar invitación', url, clickable: false },
        notice:
          'Este enlace vence en 7 días. Si no esperabas esta invitación, puedes ignorar el mensaje.',
      }),
    });
  }

  async sendPasswordResetEmail(input: {
    email: string;
    fullName: string;
    token: string;
  }): Promise<void> {
    const url = `${this.config.get('DASHBOARD_URL', { infer: true })}/restablecer-clave#token=${encodeURIComponent(input.token)}`;

    await this.transporter.sendMail({
      from: this.from,
      to: input.email,
      headers: DISABLE_CLICK_TRACKING_HEADERS,
      subject: 'Restablece tu contraseña de Yallegó',
      text: `Hola ${input.fullName},\n\nRecibimos una solicitud para restablecer tu contraseña. Crea una nueva aquí:\n${url}\n\nEste enlace vence en 60 minutos. Si no hiciste la solicitud, ignora este mensaje; tu contraseña no cambiará.`,
      html: renderEmailTemplate({
        preheader: 'Usa este enlace seguro para crear una nueva contraseña.',
        title: 'Restablece tu contraseña',
        greeting: `Hola ${input.fullName},`,
        bodyHtml: paragraph(
          'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el botón para crear una nueva.',
        ),
        action: { label: 'Crear nueva contraseña', url, clickable: false },
        notice:
          'Este enlace vence en 60 minutos. Si no hiciste la solicitud, ignora este mensaje; tu contraseña no cambiará.',
      }),
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
      from: this.from,
      to: input.email,
      subject: `El plan de ${input.businessName} cambia a ${input.toPlan}`,
      text: `Hola ${input.fullName}. Confirmamos el pago de ${input.businessName}: el plan cambia a ${input.toPlan} ${when}.`,
      html: renderEmailTemplate({
        preheader: `Confirmación del cambio de plan de ${input.businessName}.`,
        title: 'Cambio de plan confirmado',
        greeting: `Hola ${input.fullName},`,
        bodyHtml: paragraph(
          `Confirmamos el pago de <strong>${escapeHtml(input.businessName)}</strong>. El plan cambiará a <strong>${escapeHtml(input.toPlan)}</strong> ${escapeHtml(when)}.`,
        ),
      }),
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
      from: this.from,
      to: input.email,
      subject: `${input.businessName} ${status}`,
      text: `Hola ${input.fullName}. ${input.businessName} ${status} (${input.limit} transacciones). El límite se renueva el ${input.resetsAt}. Considera actualizar de plan si esperas seguir recibiendo cobros a este ritmo.`,
      html: renderEmailTemplate({
        preheader: `${input.businessName} ${status}.`,
        title:
          input.percentage === 100 ? 'Límite mensual alcanzado' : 'Estás cerca del límite mensual',
        greeting: `Hola ${input.fullName},`,
        bodyHtml:
          paragraph(
            `<strong>${escapeHtml(input.businessName)}</strong> ${escapeHtml(status)} (${input.limit} transacciones).`,
          ) +
          paragraph(
            `El límite se renueva el ${escapeHtml(input.resetsAt)}. Considera actualizar de plan si esperas seguir recibiendo cobros a este ritmo.`,
          ),
      }),
    });
  }

  async sendTrialEndedEmail(input: {
    email: string;
    fullName: string;
    businessName: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.email,
      subject: `La prueba gratuita de ${input.businessName} terminó`,
      text: `Hola ${input.fullName}. La prueba gratuita de ${input.businessName} en Yallegó terminó. Tu cuenta e historial siguen disponibles en modo lectura; elige un plan para volver a procesar cobros.`,
      html: renderEmailTemplate({
        preheader: `La prueba gratuita de ${input.businessName} terminó.`,
        title: 'Tu prueba gratuita terminó',
        greeting: `Hola ${input.fullName},`,
        bodyHtml:
          paragraph(
            `La prueba gratuita de <strong>${escapeHtml(input.businessName)}</strong> en Yallegó terminó.`,
          ) +
          paragraph(
            'Tu cuenta y tu historial siguen disponibles en modo lectura. Elige un plan para seguir capturando cobros.',
          ),
      }),
    });
  }

  async sendDeviceOfflineEmail(input: {
    email: string;
    fullName: string;
    deviceLabel: string;
    businessName: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.email,
      subject: `${input.deviceLabel} dejó de reportar en ${input.businessName}`,
      text: `Hola ${input.fullName}. El dispositivo "${input.deviceLabel}" no envía señal hace más de 15 minutos y quedó marcado como desconectado. Revisa que tenga conexión a internet y la app abierta.`,
      html: renderEmailTemplate({
        preheader: `${input.deviceLabel} dejó de reportar en ${input.businessName}.`,
        title: 'Dispositivo desconectado',
        greeting: `Hola ${input.fullName},`,
        bodyHtml:
          paragraph(
            `El dispositivo <strong>${escapeHtml(input.deviceLabel)}</strong> no envía señal hace más de 15 minutos y quedó marcado como desconectado.`,
          ) + paragraph('Revisa que tenga conexión a internet y la aplicación abierta.'),
      }),
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
      from: this.from,
      to: input.email,
      subject: `Un webhook de ${input.businessName} se deshabilitó automáticamente`,
      text: `Hola ${input.fullName}. El webhook "${input.endpointUrl}" se deshabilitó automáticamente (${input.reason}). Revísalo y, si corresponde, actívalo de nuevo desde el panel.`,
      html: renderEmailTemplate({
        preheader: `Un webhook de ${input.businessName} requiere atención.`,
        title: 'Webhook deshabilitado',
        greeting: `Hola ${input.fullName},`,
        bodyHtml:
          paragraph(
            `El webhook <strong>${escapeHtml(input.endpointUrl)}</strong> se deshabilitó automáticamente (${escapeHtml(input.reason)}).`,
          ) + paragraph('Revísalo y, si corresponde, actívalo de nuevo desde el panel.'),
      }),
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
      from: this.from,
      to: input.email,
      subject: `[Yallegó] ${input.subject}`,
      text: `Hola ${input.fullName}. ${input.message}`,
      html: renderEmailTemplate({
        preheader: input.subject,
        title: input.subject,
        greeting: `Hola ${input.fullName},`,
        bodyHtml: paragraph(escapeHtml(input.message)),
      }),
    });
  }

  async sendDeviceRecoveredEmail(input: {
    email: string;
    fullName: string;
    deviceLabel: string;
    businessName: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.email,
      subject: `${input.deviceLabel} volvió a conectarse en ${input.businessName}`,
      text: `Hola ${input.fullName}. El dispositivo "${input.deviceLabel}" volvió a enviar señal con normalidad.`,
      html: renderEmailTemplate({
        preheader: `${input.deviceLabel} volvió a conectarse.`,
        title: 'Dispositivo reconectado',
        greeting: `Hola ${input.fullName},`,
        bodyHtml: paragraph(
          `El dispositivo <strong>${escapeHtml(input.deviceLabel)}</strong> volvió a enviar señal con normalidad.`,
        ),
      }),
    });
  }
}
