import { IsIn, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID()
  transactionId!: string;

  @IsIn(['MTN_MOMO', 'ORANGE_MONEY'])
  provider!: 'MTN_MOMO' | 'ORANGE_MONEY';

  @IsNumber()
  @IsPositive()
  amount!: number;
}
