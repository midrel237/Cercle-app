import type { Currency } from './user';

export type TransactionType =
  | 'contribution'
  | 'rotation_payout'
  | 'loan_disbursement'
  | 'loan_repayment'
  | 'event_contribution'
  | 'event_payout'
  | 'fee'
  // Déduction sur le versement de tour d'un membre au titre d'un retard
  // de cotisation accumulé (cf. GroupMember.outstandingDebt).
  | 'arrears_deduction'
  // Remboursement dû lors d'une sortie volontaire (dans un sens ou l'autre
  // selon que le tour du membre est déjà passé, cf. GroupsService.decideExit).
  | 'member_exit_settlement';

export type TransactionStatus = 'pending' | 'processing' | 'confirmed' | 'failed';

export type MobileMoneyProvider = 'mtn_momo' | 'orange_money';
export type PaymentMethodType = 'mobile_money' | 'bank_card' | 'bank_transfer';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  // MOBILE_MONEY
  provider?: MobileMoneyProvider;
  phoneNumber?: string;
  // BANK_CARD (diaspora)
  cardBrand?: string;
  cardLast4?: string;
  // BANK_TRANSFER (diaspora)
  bankName?: string;
  bankCountry?: string;
  ibanLast4?: string;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Entrée du ledger central — table unique et immuable de tous les mouvements
 * financiers (cf. cahier des charges, 6.2 Principe du ledger central).
 */
export interface LedgerTransaction {
  id: string;
  groupId: string;
  userId: string;
  type: TransactionType;
  amount: number; // montant dans la devise d'origine (cf. `currency`)
  currency: Currency;
  amountXaf: number; // montant converti en FCFA, devise pivot du ledger
  fxRate?: number; // taux appliqué si currency != XAF
  status: TransactionStatus;
  provider?: MobileMoneyProvider;
  externalReference?: string; // référence de paiement Mobile Money
  relatedLoanId?: string;
  createdAt: string;
  confirmedAt?: string;
}
