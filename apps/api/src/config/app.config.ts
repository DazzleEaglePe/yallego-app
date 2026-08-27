import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  environment: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  dashboardUrl: process.env.DASHBOARD_URL ?? 'http://localhost:3000',
}));
