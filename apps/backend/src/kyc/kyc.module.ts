import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { DiditService } from './didit.service';

@Module({
  controllers: [KycController],
  providers: [DiditService],
  exports: [DiditService],
})
export class KycModule {}
