import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name!: string;

  @IsIn(['ROTATIVE', 'INTERNAL_LOAN', 'MIXED'])
  mode!: 'ROTATIVE' | 'INTERNAL_LOAN' | 'MIXED';

  @IsNumber()
  @IsPositive()
  contributionAmount!: number;

  @IsInt()
  @Min(1)
  periodicityDays!: number;

  @IsIn(['DRAW', 'FIXED'])
  rotationOrderType!: 'DRAW' | 'FIXED';

  @IsOptional()
  @IsString()
  penaltyRules?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  /// Autorise les membres de la diaspora à rejoindre et cotiser depuis
  /// l'étranger (carte bancaire / virement, conversion de devise).
  @IsOptional()
  @IsBoolean()
  openToDiaspora?: boolean;
}
