import { z } from 'zod';

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default('http://localhost:3001'),
  NEXT_PUBLIC_WS_URL: z.url().default('ws://localhost:3001'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Yallegó'),
});

export const publicEnvironment = publicEnvironmentSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
