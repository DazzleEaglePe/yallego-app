import {
  BimParser,
  PlinBbvaParser,
  PlinInterbankParser,
  YapeParser,
  type Parser,
  type ParserRules,
} from '@yallego/parsers';

/**
 * Constructores conocidos por código de billetera. Deliberadamente no incluye
 * PLIN_SCOTIABANK ni PLIN_BANBIF: sus parsers no están en el alcance del
 * Sprint 4 (docs/10_PLAN_DESARROLLO.md §13, "Parsers de billeteras
 * adicionales" → v0.2). Sus notificaciones quedan `UNMATCHED` hasta entonces,
 * comportamiento correcto y esperado, no un error.
 *
 * Único origen de verdad: lo usan tanto `ParseNotificationUseCase` (parsing
 * real) como `PlatformParsersService` (probar una versión en borrador antes
 * de activarla) — deben resolver exactamente el mismo parser por billetera.
 */
export const PARSER_CONSTRUCTORS: Record<string, new (rules: readonly ParserRules[]) => Parser> = {
  YAPE: YapeParser,
  PLIN_BBVA: PlinBbvaParser,
  PLIN_INTERBANK: PlinInterbankParser,
  BIM: BimParser,
};
