import { IsNumber, IsPositive } from 'class-validator';

export class ContributeEventDto {
  @IsNumber()
  @IsPositive()
  amount!: number;
}
