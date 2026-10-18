import { IsIn, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class PrepareContributionDto {
  @IsUUID()
  groupId!: string;

  @IsIn(['MTN_MOMO', 'ORANGE_MONEY'])
  @IsOptional()
  provider?: 'MTN_MOMO' | 'ORANGE_MONEY';

  /// Cotisation versée pour un évènement (cagnotte, écran 56, Phase 5)
  /// plutôt que pour le cycle actif. Si présent, `amount` devient possible :
  /// la cagnotte accepte des montants libres par contributeur (la
  /// suggestion de l'évènement reste le défaut côté UI).
  @IsUUID()
  @IsOptional()
  eventId?: string;

  /// Montant libre pour une cotisation d'évènement (jamais pour le cycle
  /// actif, dont le montant est fixé par le groupe). Minimum appliqué
  /// côté service (100 XAF).
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;
}
