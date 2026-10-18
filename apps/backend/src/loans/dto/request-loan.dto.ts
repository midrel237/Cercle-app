import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestLoanDto {
  @IsUUID()
  groupId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  /// Durée de remboursement en mois — 1, 3 ou 6 (maquette écran 58).
  @IsIn([1, 3, 6])
  durationMonths!: number;

  /// Motif de la demande, affiché aux membres votants (écran 59).
  @IsString()
  @MaxLength(300)
  reason!: string;

  /// Garant optionnel : membre du groupe (maquette 58 « Garant (optionnel) »).
  @IsUUID()
  @IsOptional()
  guarantorId?: string;
}
