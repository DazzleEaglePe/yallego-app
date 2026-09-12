const actionLabels: Record<string, string> = {
  'api_keys.created': 'Clave de API creada',
  'api_keys.revoked': 'Clave de API revocada',
  'auth.email_verified': 'Correo verificado',
  'auth.password_reset': 'Contraseña restablecida',
  'auth.user_registered': 'Usuario registrado',
  'devices.paired': 'Dispositivo vinculado',
  'devices.pairing_code_created': 'Código de vinculación creado',
  'devices.revoked': 'Dispositivo revocado',
  'members.invitation_accepted': 'Invitación aceptada',
  'members.invitation_revoked': 'Invitación revocada',
  'members.invitation_sent': 'Invitación enviada',
  'members.ownership_transferred': 'Propiedad transferida',
  'members.removed': 'Miembro eliminado',
  'members.role_changed': 'Rol modificado',
  'wallets.activated': 'Billetera activada',
  'wallets.deactivated': 'Billetera desactivada',
  'webhooks.auto_disabled': 'Webhook desactivado automáticamente',
  'webhooks.created': 'Webhook creado',
  'webhooks.deleted': 'Webhook eliminado',
  'webhooks.delivery_retried': 'Entrega de webhook reintentada',
  'webhooks.secret_rotated': 'Secreto de webhook rotado',
  'webhooks.updated': 'Webhook actualizado',
};

export const auditActionOptions = Object.entries(actionLabels)
  .map(([value, label]) => ({ label, value }))
  .sort((left, right) => left.label.localeCompare(right.label, 'es'));

export const auditResourceOptions = [
  { label: 'Claves de API', value: 'api_key' },
  { label: 'Dispositivos', value: 'device' },
  { label: 'Invitaciones', value: 'invitation' },
  { label: 'Miembros', value: 'membership' },
  { label: 'Billeteras', value: 'tenant_wallet' },
  { label: 'Webhooks', value: 'webhook_endpoint' },
  { label: 'Entregas de webhook', value: 'webhook_delivery' },
];

export function auditActionLabel(action: string): string {
  return actionLabels[action] ?? humanize(action);
}

export function auditActorLabel(actorType: string): string {
  const labels: Record<string, string> = {
    API_KEY: 'Clave de API',
    DEVICE: 'Dispositivo',
    PLATFORM_ADMIN: 'Administración',
    SYSTEM: 'Sistema',
    USER: 'Usuario',
  };
  return labels[actorType] ?? humanize(actorType);
}

export function auditResourceLabel(resourceType: string | null): string {
  if (!resourceType) return 'Sin recurso';
  return (
    auditResourceOptions.find((option) => option.value === resourceType)?.label ??
    humanize(resourceType)
  );
}

function humanize(value: string): string {
  const normalized = value.replaceAll(/[._-]/g, ' ').trim();
  return normalized ? normalized[0]!.toUpperCase() + normalized.slice(1) : value;
}
