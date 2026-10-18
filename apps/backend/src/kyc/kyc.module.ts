import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycWebhookController } from './kyc-webhook.controller';
import { DiditService } from './didit.service';

@Module({
  controllers: [KycController, KycWebhookController],
  providers: [DiditService],
  exports: [DiditService],
})
export class KycModule {}
