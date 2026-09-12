import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { PrismaClient } from '@prisma/client';

type Sample = { durationMs: number; status: number };
type Summary = {
  errors: number;
  errorRate: number;
  name: string;
  p50Ms: number;
  p95Ms: number;
  requests: number;
  requestsPerSecond: number;
  statuses: Record<string, number>;
};

const baseUrl = new URL(process.env.LOAD_TEST_BASE_URL ?? 'http://127.0.0.1:3301');
const mailpitUrl = new URL(process.env.LOAD_TEST_MAILPIT_URL ?? 'http://127.0.0.1:8025');
const durationSeconds = positiveNumber('LOAD_TEST_DURATION_SECONDS', 10);
const ingestRps = positiveNumber('LOAD_TEST_INGEST_RPS', 1);
// Mantiene la corrida por defecto bajo el límite global de 60 req/min,
// contando también bootstrap e ingesta. Para superar ese límite de forma
// deliberada, levanta una instancia aislada con una política de carga propia.
const queryRps = positiveNumber('LOAD_TEST_QUERY_RPS', 4);
const ingestBatchSize = positiveInteger('LOAD_TEST_INGEST_BATCH_SIZE', 5);
const maxErrorRate = nonNegativeNumber('LOAD_TEST_MAX_ERROR_RATE', 0.01);
const maxIngestP95Ms = positiveNumber('LOAD_TEST_MAX_INGEST_P95_MS', 500);
const maxQueryP95Ms = positiveNumber('LOAD_TEST_MAX_QUERY_P95_MS', 300);

assertSafeTarget(baseUrl);

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const email = `load-${suffix}@yallego.local`;
const password = `Load-${randomUUID()}-safe`;

async function main(): Promise<void> {
  let userCreated = false;
  try {
    const credentials = await bootstrapFixture();
    userCreated = true;

    const ingest = await runAtRate('ingest', ingestRps, durationSeconds, async (index) =>
      timedRequest('/internal/v1/ingest', {
        method: 'POST',
        headers: authorization(credentials.deviceToken),
        body: JSON.stringify({
          notifications: Array.from({ length: ingestBatchSize }, (_, batchIndex) => ({
            client_ref: `load-${suffix}-${index}-${batchIndex}`,
            package_name: 'com.bcp.innovacxion.yapeapp',
            title: 'Yape!',
            body: 'Te Yapearon S/ 1.00 de PRUEBA DE CARGA. Código de seguridad: 123',
            posted_at: new Date().toISOString(),
          })),
        }),
      }),
    );

    const query = await runAtRate('transactions', queryRps, durationSeconds, () =>
      timedRequest('/v1/transactions?limit=50', {
        headers: authorization(credentials.accessToken),
      }),
    );

    const failures = [
      ...(ingest.errorRate > maxErrorRate
        ? [`ingest error rate ${percent(ingest.errorRate)} > ${percent(maxErrorRate)}`]
        : []),
      ...(query.errorRate > maxErrorRate
        ? [`query error rate ${percent(query.errorRate)} > ${percent(maxErrorRate)}`]
        : []),
      ...(ingest.p95Ms > maxIngestP95Ms
        ? [`ingest p95 ${ingest.p95Ms} ms > ${maxIngestP95Ms} ms`]
        : []),
      ...(query.p95Ms > maxQueryP95Ms
        ? [`query p95 ${query.p95Ms} ms > ${maxQueryP95Ms} ms`]
        : []),
    ];

    console.log(JSON.stringify({ configuration: configurationSummary(), results: [ingest, query] }, null, 2));
    if (failures.length > 0) throw new Error(`Load thresholds failed: ${failures.join('; ')}`);
  } finally {
    if (userCreated) await cleanupFixture();
    await prisma.$disconnect();
  }
}

async function bootstrapFixture(): Promise<{ accessToken: string; deviceToken: string }> {
  await mustRequest('/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      full_name: 'Prueba de carga local',
      business_name: `Carga local ${suffix}`,
    }),
  });

  const verificationToken = await readVerificationToken();
  await mustRequest('/v1/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token: verificationToken }),
  });
  const login = await mustRequest<{ access_token: string }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const accessToken = login.access_token;

  await mustRequest('/v1/wallets', {
    method: 'POST',
    headers: authorization(accessToken),
    body: JSON.stringify({ wallet_code: 'YAPE' }),
  });
  const pairing = await mustRequest<{ code: string }>('/v1/devices/pairing-codes', {
    method: 'POST',
    headers: authorization(accessToken),
    body: JSON.stringify({ label: 'Dispositivo de carga local' }),
  });
  const device = await mustRequest<{ device_token: string }>('/internal/v1/devices/pair', {
    method: 'POST',
    body: JSON.stringify({
      code: pairing.code,
      device: { manufacturer: 'Yallego', model: 'Local load runner' },
    }),
  });

  return { accessToken, deviceToken: device.device_token };
}

async function readVerificationToken(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const search = await fetch(
      new URL(`/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, mailpitUrl),
    );
    if (search.ok) {
      const result = (await search.json()) as { messages?: Array<{ ID: string }> };
      const messageId = result.messages?.[0]?.ID;
      if (messageId) {
        const messageResponse = await fetch(new URL(`/api/v1/message/${messageId}`, mailpitUrl));
        const message = (await messageResponse.json()) as { HTML?: string; Text?: string };
        const match = `${message.Text ?? ''}\n${message.HTML ?? ''}`.match(/[#?]token=([^&\s"'<]+)/);
        if (match?.[1]) return decodeURIComponent(match[1]);
      }
    }
    await delay(250);
  }
  throw new Error('Verification email was not available in Mailpit');
}

async function runAtRate(
  name: string,
  requestsPerSecond: number,
  seconds: number,
  operation: (index: number) => Promise<Sample>,
): Promise<Summary> {
  const total = Math.max(1, Math.floor(requestsPerSecond * seconds));
  const intervalMs = 1_000 / requestsPerSecond;
  const startedAt = performance.now();
  const pending: Array<Promise<Sample>> = [];

  for (let index = 0; index < total; index += 1) {
    const waitMs = startedAt + index * intervalMs - performance.now();
    if (waitMs > 0) await delay(waitMs);
    pending.push(operation(index));
  }

  const samples = await Promise.all(pending);
  const elapsedSeconds = (performance.now() - startedAt) / 1_000;
  const durations = samples.map(({ durationMs }) => durationMs).sort((a, b) => a - b);
  const errors = samples.filter(({ status }) => status < 200 || status >= 300).length;
  const statuses = Object.fromEntries(
    [...new Set(samples.map(({ status }) => status))]
      .sort((a, b) => a - b)
      .map((status) => [String(status), samples.filter((sample) => sample.status === status).length]),
  );
  return {
    name,
    requests: samples.length,
    errors,
    errorRate: round(errors / samples.length),
    requestsPerSecond: round(samples.length / elapsedSeconds),
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    statuses,
  };
}

async function timedRequest(path: string, init: RequestInit): Promise<Sample> {
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(path, baseUrl), withJson(init));
    await response.arrayBuffer();
    return { durationMs: performance.now() - startedAt, status: response.status };
  } catch {
    return { durationMs: performance.now() - startedAt, status: 0 };
  }
}

async function mustRequest<T = unknown>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(new URL(path, baseUrl), withJson(init));
  const body = (await response.json()) as T;
  if (!response.ok) throw new Error(`Fixture request ${path} failed with HTTP ${response.status}`);
  return body;
}

async function cleanupFixture(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.unscoped', 'on', true)`;
    const user = await tx.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    if (!user) return;
    const tenantIds = user.memberships.map(({ tenantId }) => tenantId);
    await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    await tx.user.delete({ where: { id: user.id } });
  });
}

function assertSafeTarget(target: URL): void {
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  if (!localHosts.has(target.hostname)) {
    if (process.env.ALLOW_REMOTE_LOAD_TEST !== 'true') {
      throw new Error('Remote load tests require ALLOW_REMOTE_LOAD_TEST=true');
    }
  }
}

function authorization(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function withJson(init: RequestInit): RequestInit {
  return { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } };
}

function percentile(sorted: number[], fraction: number): number {
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return Math.round((sorted[index] ?? 0) * 100) / 100;
}

function positiveInteger(name: string, fallback: number): number {
  return Math.floor(positiveNumber(name, fallback));
}

function positiveNumber(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero`);
  return value;
}

function nonNegativeNumber(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} cannot be negative`);
  return value;
}

function configurationSummary() {
  return {
    baseUrl: baseUrl.origin,
    durationSeconds,
    ingestBatchSize,
    ingestRps,
    queryRps,
    thresholds: { maxErrorRate, maxIngestP95Ms, maxQueryP95Ms },
  };
}

function percent(value: number): string {
  return `${round(value * 100)}%`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
