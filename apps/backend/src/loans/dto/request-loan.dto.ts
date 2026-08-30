import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class RequestLoanDto {
  @IsUUID()
  groupId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;
}
