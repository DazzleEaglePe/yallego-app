import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  BIM_DEFAULT_PATTERNS,
  BimParser,
  PLIN_BBVA_DEFAULT_PATTERNS,
  PLIN_INTERBANK_DEFAULT_PATTERNS,
  PlinBbvaParser,
  PlinInterbankParser,
  YAPE_DEFAULT_PATTERNS,
  YapeParser,
  type RawNotification,
} from '../src/index.js';

interface Fixture {
  name: string;
  notification: {
    packageName: string;
    title: string | null;
    text: string | null;
    postedAt: string;
  };
  expected: {
    walletCode: string;
    senderName: string | null;
    amount: { value: number; currency: string };
    securityCode: string | null;
    approvalCode: string | null;
  } | null;
}

function loadFixtures(relativePath: string): Fixture[] {
  const url = new URL(relativePath, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as Fixture[];
}

const suites = [
  {
    walletCode: 'YAPE',
    fixtures: loadFixtures('../fixtures/yape/samples.json'),
    parser: new YapeParser(YAPE_DEFAULT_PATTERNS),
  },
  {
    walletCode: 'PLIN_BBVA',
    fixtures: loadFixtures('../fixtures/plin-bbva/samples.json'),
    parser: new PlinBbvaParser(PLIN_BBVA_DEFAULT_PATTERNS),
  },
  {
    walletCode: 'PLIN_INTERBANK',
    fixtures: loadFixtures('../fixtures/plin-interbank/samples.json'),
    parser: new PlinInterbankParser(PLIN_INTERBANK_DEFAULT_PATTERNS),
  },
  {
    walletCode: 'BIM',
    fixtures: loadFixtures('../fixtures/bim/samples.json'),
    parser: new BimParser(BIM_DEFAULT_PATTERNS),
  },
];

describe.each(suites)('$walletCode parser', ({ fixtures, parser }) => {
  it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))('%s', (_name, fixture) => {
    const raw: RawNotification = {
      packageName: fixture.notification.packageName,
      title: fixture.notification.title,
      text: fixture.notification.text,
      postedAt: new Date(fixture.notification.postedAt),
    };

    expect(parser.supports(raw)).toBe(true);
    const result = parser.parse(raw);

    if (fixture.expected === null) {
      expect(result).toBeNull();
      return;
    }

    expect(result).not.toBeNull();
    expect(result?.walletCode).toBe(fixture.expected.walletCode);
    expect(result?.senderName).toBe(fixture.expected.senderName);
    expect(result?.amount).toEqual(fixture.expected.amount);
    expect(result?.securityCode).toBe(fixture.expected.securityCode);
    expect(result?.approvalCode).toBe(fixture.expected.approvalCode);
    expect(result?.occurredAt.toISOString()).toBe(fixture.notification.postedAt);
  });
});
