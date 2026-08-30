import { IsIn, IsString } from 'class-validator';

/**
 * Compte Mobile Money du caissier utilisé comme compte de dépôt du groupe :
 * c'est là que les autres membres versent leur cotisation, avant que le
 * caissier ne reverse la cagnotte au bénéficiaire. Le compte reste la
 * propriété du caissier — la plateforme ne détient jamais les fonds (§7,
 * Option A).
 */
export class RegisterDepositAccountDto {
  @IsIn(['MTN_MOMO', 'ORANGE_MONEY'])
  provider!: 'MTN_MOMO' | 'ORANGE_MONEY';

  @IsString()
  phoneNumber!: string;
}
