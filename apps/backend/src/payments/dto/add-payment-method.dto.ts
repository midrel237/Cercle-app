import { IsBoolean, IsIn, IsOptional, IsPhoneNumber, IsString, ValidateIf } from 'class-validator';

/**
 * Ajout d'un moyen de paiement. Le sous-ensemble de champs requis dépend de
 * `type` :
 * - MOBILE_MONEY  → provider + phoneNumber
 * - BANK_CARD     → cardToken (émis côté client par le SDK du PSP après
 *                   tokenisation ; jamais de PAN/CVV transmis à l'API)
 * - BANK_TRANSFER → bankName + bankCountry + iban (tronqué en ibanLast4
 *                   à la persistance, jamais stocké en clair)
 *
 * BANK_CARD et BANK_TRANSFER ne sont proposés que si le groupe concerné a
 * `openToDiaspora = true` — à valider côté service, pas seulement côté DTO.
 */
export class AddPaymentMethodDto {
  @IsIn(['MOBILE_MONEY', 'BANK_CARD', 'BANK_TRANSFER'])
  type!: 'MOBILE_MONEY' | 'BANK_CARD' | 'BANK_TRANSFER';

  // --- MOBILE_MONEY ---
  @ValidateIf((o) => o.type === 'MOBILE_MONEY')
  @IsIn(['MTN_MOMO', 'ORANGE_MONEY'])
  provider?: 'MTN_MOMO' | 'ORANGE_MONEY';

  @ValidateIf((o) => o.type === 'MOBILE_MONEY')
  @IsPhoneNumber()
  phoneNumber?: string;

  // --- BANK_CARD ---
  @ValidateIf((o) => o.type === 'BANK_CARD')
  @IsString()
  cardToken?: string;

  @ValidateIf((o) => o.type === 'BANK_CARD')
  @IsIn(['VISA', 'MASTERCARD'])
  cardBrand?: 'VISA' | 'MASTERCARD';

  @ValidateIf((o) => o.type === 'BANK_CARD')
  @IsString()
  cardLast4?: string;

  // --- BANK_TRANSFER ---
  @ValidateIf((o) => o.type === 'BANK_TRANSFER')
  @IsString()
  bankName?: string;

  @ValidateIf((o) => o.type === 'BANK_TRANSFER')
  @IsString()
  bankCountry?: string;

  @ValidateIf((o) => o.type === 'BANK_TRANSFER')
  @IsString()
  ibanLast4?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
