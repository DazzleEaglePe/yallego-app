import type { ParserRules } from '@yallego/parsers';

export const PARSER_PATTERN_REPOSITORY_PORT = Symbol('PARSER_PATTERN_REPOSITORY_PORT');

export interface ActivePatternSet {
  /** Id de la versión activa de `ParserPattern`, para trazabilidad en `raw_notifications.parser_pattern_id`. */
  patternId: string;
  rules: ParserRules[];
}

export interface ParserPatternRepositoryPort {
  findActivePatterns(walletCode: string): Promise<ActivePatternSet | null>;
  /** Se llama al activar una nueva versión, para no servir el patrón anterior desde caché. */
  invalidate(walletCode: string): Promise<void>;
}
