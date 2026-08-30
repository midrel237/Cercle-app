import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CinetPayAggregator } from './cinetpay.aggregator';

@Module({
  imports: [TransactionsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    { provide: 'MOBILE_MONEY_AGGREGATOR', useClass: CinetPayAggregator },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
