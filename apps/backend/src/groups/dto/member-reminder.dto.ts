import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class MemberReminderDto {
  /// Message personnalisé (écran 47 : zone de texte pré-remplie).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  /// « Envoyer aussi par SMS » (maquette écran 47) — un SMS réel part
  /// via le SmsProvider si coché (coût opérateur).
  @IsBoolean()
  @IsOptional()
  alsoSms?: boolean;
}
