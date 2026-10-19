import { Module } from '@nestjs/common';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

/**
 * Relevé PDF d'un groupe (écran 69). Dépend uniquement de PrismaService
 * (fourni globalement par DatabaseModule) et de la stratégie jwt-query
 * (enregistrée dans AuthModule).
 */
@Module({
  controllers: [StatementsController],
  providers: [StatementsService],
})
export class StatementsModule {}
