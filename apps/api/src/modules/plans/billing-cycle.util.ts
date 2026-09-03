import type { BillingCycle } from '@prisma/client';

/** Próximo `periodEnd` a partir de `periodStart`, según el ciclo de facturación. `setUTCMonth` maneja el desborde de año correctamente. */
export function addBillingCycle(periodStart: Date, cycle: BillingCycle): Date {
  const months = cycle === 'MONTHLY' ? 1 : cycle === 'SEMIANNUAL' ? 6 : 12;
  const next = new Date(periodStart);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}
