import { IsIn, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

const TRANSACTION_TYPES = [
  'CONTRIBUTION',
  'ROTATION_PAYOUT',
  'LOAN_DISBURSEMENT',
  'LOAN_REPAYMENT',
  'EVENT_CONTRIBUTION',
  'EVENT_PAYOUT',
  'FEE',
  'ARREARS_DEDUCTION',
  'MEMBER_EXIT_SETTLEMENT',
] as const;

export class CreateTransactionDto {
  @IsUUID()
  groupId!: string;

  @IsIn(TRANSACTION_TYPES)
  type!: (typeof TRANSACTION_TYPES)[number];

  /** Montant dans la devise d'origine (cf. `currency`). */
  @IsNumber()
  @IsPositive()
  amount!: number;

  /**
   * Devise d'origine. XAF pour un paiement Mobile Money local ; EUR/USD/
   * GBP/CAD pour une cotisation diaspora par carte ou virement — auquel
   * cas `amountXaf` et `fxRate` doivent être renseignés (conversion figée
   * au moment de la transaction).
   */
  @IsOptional()
  @IsIn(['XAF', 'EUR', 'USD', 'GBP', 'CAD'])
  currency?: 'XAF' | 'EUR' | 'USD' | 'GBP' | 'CAD';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amountXaf?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  fxRate?: number;

  @IsOptional()
  @IsIn(['MTN_MOMO', 'ORANGE_MONEY'])
  provider?: 'MTN_MOMO' | 'ORANGE_MONEY';

  @IsOptional()
  @IsUUID()
  relatedLoanId?: string;
}
