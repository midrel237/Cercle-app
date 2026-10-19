import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

@Module({
  controllers: [TransactionsController, StatementsController],
  providers: [TransactionsService, StatementsService],
  exports: [TransactionsService, StatementsService],
})
export class TransactionsModule {}
