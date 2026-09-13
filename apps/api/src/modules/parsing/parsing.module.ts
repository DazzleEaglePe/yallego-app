import { Module } from '@nestjs/common';

import { CryptoModule } from '../../infrastructure/crypto/crypto.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { PlansModule } from '../plans/plans.module';
import { ParseNotificationUseCase } from './application/parse-notification.usecase';
import { PrismaParserPatternRepository } from './adapters/prisma-parser-pattern.repository';
import { ParsingWorker } from './adapters/parsing.worker';
import { PARSER_PATTERN_REPOSITORY_PORT } from './ports/parser-pattern-repository.port';

@Module({
  imports: [QueueModule, CryptoModule, PlansModule],
  providers: [
    ParseNotificationUseCase,
    ParsingWorker,
    { provide: PARSER_PATTERN_REPOSITORY_PORT, useClass: PrismaParserPatternRepository },
  ],
  exports: [PARSER_PATTERN_REPOSITORY_PORT],
})
export class ParsingModule {}
