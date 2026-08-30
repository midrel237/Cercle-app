import { IsIn, IsISO31661Alpha2, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class RegisterDto {
  @IsPhoneNumber()
  phoneNumber!: string;

  @IsString()
  fullName!: string;

  @IsIn(['fr', 'en'])
  language!: 'fr' | 'en';

  /// Pays de résidence (ISO 3166-1 alpha-2). Renseigné dès l'inscription
  /// pour les membres de la diaspora, déduit sinon de l'indicatif du
  /// numéro de téléphone.
  @IsOptional()
  @IsISO31661Alpha2()
  countryOfResidence?: string;

  @IsOptional()
  @IsIn(['XAF', 'EUR', 'USD', 'GBP', 'CAD'])
  preferredCurrency?: 'XAF' | 'EUR' | 'USD' | 'GBP' | 'CAD';
}
