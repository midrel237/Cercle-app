import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class PrepareContributionDto {
  /// Groupe pour lequel la cotisation est préparée.
  @IsUUID()
  groupId!: string;

  /// Opérateur Mobile Money choisi par le membre (écran 32 : « Entrez
  /// votre code secret MoMo »). Par défaut MTN MoMo si absent.
  @IsIn(['MTN_MOMO', 'ORANGE_MONEY'])
  @IsOptional()
  provider?: 'MTN_MOMO' | 'ORANGE_MONEY';

  /// Cotisation versée pour un évènement (cagnotte) plutôt que pour le
  /// cycle actif — écran 56 (Phase 5, évènements). Rend le DTO réutilisable.
  @IsUUID()
  @IsOptional()
  eventId?: string;
}
