import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    code: 'FREE',
    displayName: 'Free',
    priceMonthly: 0,
    priceSemiannual: null,
    priceAnnual: null,
    sortOrder: 1,
    limits: {
      wallets: 1,
      devices: 1,
      transactions_per_month: 200,
      users: 1,
      webhooks: 0,
      websocket_api: false,
      retention_days: 30,
      rate_limit_per_minute: 0,
      support: 'community',
    },
  },
  {
    code: 'NEGOCIO',
    displayName: 'Negocio',
    priceMonthly: 29,
    priceSemiannual: 156,
    priceAnnual: 290,
    sortOrder: 2,
    limits: {
      wallets: 3,
      devices: 2,
      transactions_per_month: 2_000,
      users: 3,
      webhooks: 1,
      websocket_api: false,
      retention_days: 90,
      rate_limit_per_minute: 60,
      support: 'email',
    },
  },
  {
    code: 'COMERCIO',
    displayName: 'Comercio',
    priceMonthly: 79,
    priceSemiannual: 426,
    priceAnnual: 790,
    sortOrder: 3,
    limits: {
      wallets: -1,
      devices: 5,
      transactions_per_month: 15_000,
      users: 10,
      webhooks: 5,
      websocket_api: true,
      retention_days: 365,
      rate_limit_per_minute: 300,
      support: 'priority',
    },
  },
  {
    code: 'CADENA',
    displayName: 'Cadena',
    priceMonthly: 199,
    priceSemiannual: 1_074,
    priceAnnual: 1_990,
    sortOrder: 4,
    limits: {
      wallets: -1,
      devices: -1,
      transactions_per_month: -1,
      users: -1,
      webhooks: -1,
      websocket_api: true,
      retention_days: 1_095,
      rate_limit_per_minute: 1_000,
      support: 'sla',
    },
  },
] as const;

const wallets = [
  ['YAPE', 'Yape', 'YAPE', 'BCP', 'com.bcp.innovacxion.yapeapp'],
  ['PLIN_BBVA', 'Plin · BBVA', 'PLIN', 'BBVA', 'com.bbva.nxtapp'],
  ['PLIN_INTERBANK', 'Plin · Interbank', 'PLIN', 'INTERBANK', 'pe.com.interbank.mobilebanking'],
  ['PLIN_SCOTIABANK', 'Plin · Scotiabank', 'PLIN', 'SCOTIABANK', 'com.scotiabank.scotiabankperu'],
  ['PLIN_BANBIF', 'Plin · BanBif', 'PLIN', 'BANBIF', 'pe.banbif.mobilebanking'],
  ['BIM', 'BIM', 'BIM', 'PDP', 'pe.pagoefectivo.bim'],
] as const;

async function seed(): Promise<void> {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      create: plan,
      update: plan,
    });
  }

  for (const [code, displayName, provider, issuer, androidPackage] of wallets) {
    await prisma.wallet.upsert({
      where: { code },
      create: { code, displayName, provider, issuer, androidPackage },
      update: { displayName, provider, issuer, androidPackage },
    });
  }
}

seed()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
