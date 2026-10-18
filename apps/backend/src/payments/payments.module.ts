import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransactionsModule } from '../transactions/transactions.module';
import { LoansModule } from '../loans/loans.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CinetPayAggregator } from './cinetpay.aggregator';

@Module({
  imports: [ConfigModule, TransactionsModule, LoansModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    { provide: 'MOBILE_MONEY_AGGREGATOR', useClass: CinetPayAggregator },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
