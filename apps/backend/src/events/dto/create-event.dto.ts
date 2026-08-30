import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, ValidateIf } from 'class-validator';

/**
 * Cagnotte ponctuelle pour un évènement de vie d'un membre (deuil,
 * anniversaire, naissance, mariage, maladie...). Tous les membres du groupe
 * peuvent y cotiser librement pour le bénéficiaire désigné.
 */
export class CreateEventDto {
  @IsUUID()
  groupId!: string;

  @IsIn(['DEUIL', 'ANNIVERSAIRE', 'NAISSANCE', 'MARIAGE', 'MALADIE', 'AUTRE'])
  type!: 'DEUIL' | 'ANNIVERSAIRE' | 'NAISSANCE' | 'MARIAGE' | 'MALADIE' | 'AUTRE';

  @ValidateIf((dto) => dto.type === 'AUTRE')
  @IsString()
  customLabel?: string;

  @IsUUID()
  beneficiaryUserId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  suggestedAmount?: number;
}
