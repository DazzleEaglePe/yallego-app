import { compilePattern, normalizeText, parseAmount } from './normalize.js';
import type { NormalizedTransaction, Parser, ParserRules, RawNotification } from './parser.port.js';

/**
 * Base común: intenta cada patrón activo, en orden, contra el cuerpo (y el
 * título si `matchTitle`) hasta encontrar uno con al menos el grupo `amount`.
 * Un patrón mal formado o que no matchea nunca lanza — solo pasa al siguiente.
 */
export abstract class RegexParser implements Parser {
  abstract readonly walletCode: string;
  protected abstract readonly packageNames: readonly string[];

  constructor(protected readonly patterns: readonly ParserRules[]) {}

  supports(raw: RawNotification): boolean {
    return this.packageNames.includes(raw.packageName);
  }

  parse(raw: RawNotification): NormalizedTransaction | null {
    for (const rules of this.patterns) {
      const result = this.tryPattern(rules, raw);
      if (result) return result;
    }
    return null;
  }

  private tryPattern(rules: ParserRules, raw: RawNotification): NormalizedTransaction | null {
    let regex: RegExp;
    try {
      regex = compilePattern(rules);
    } catch {
      return null;
    }

    const candidates = [raw.text, rules.matchTitle ? raw.title : null].filter(
      (value): value is string => Boolean(value),
    );

    for (const candidate of candidates) {
      const match = regex.exec(candidate);
      const rawAmount = match?.groups?.['amount'];
      if (!rawAmount) continue;

      const amount = parseAmount(rawAmount);
      if (amount === null) continue;

      const sender = match.groups?.['sender'];
      return {
        walletCode: this.walletCode,
        senderName: sender ? normalizeText(sender) : null,
        amount: { value: amount, currency: 'PEN' },
        securityCode: match.groups?.['securityCode'] ?? null,
        approvalCode: match.groups?.['approvalCode'] ?? null,
        occurredAt: raw.postedAt,
      };
    }

    return null;
  }
}
