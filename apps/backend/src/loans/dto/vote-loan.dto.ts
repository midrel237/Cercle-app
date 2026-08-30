import { IsBoolean } from 'class-validator';

export class VoteLoanDto {
  @IsBoolean()
  approve!: boolean;
}
