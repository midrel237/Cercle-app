import { apiClient } from '../api-client';

export type MobileMoneyProvider = 'MTN_MOMO' | 'ORANGE_MONEY';

/** Transaction du ledger — statut, sens, moyen de paiement. */
export interface LedgerTransactionDto {
  id: string;
  groupId: string | null;
  type: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | string;
  amount: string;
  currency: string;
  isCredit: boolean;
  provider: MobileMoneyProvider | null;
  externalReference: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

/** Réponse de POST /payments/prepare — transaction PENDING prête à initier. */
export interface PreparedPaymentDto {
  transaction: LedgerTransactionDto;
  /** Montant à collecter, en devise pivot XAF. */
  amountXaf: string;
}

/** Moyen de paiement lié au compte (écran 34). */
export interface PaymentMethodDto {
  id: string;
  kind: 'MOBILE_MONEY' | 'BANK_CARD' | 'BANK_TRANSFER' | string;
  provider: string | null;
  /** Numéro masqué côté backend (ex. +237 6•• ••• 789). */
  maskedNumber: string | null;
  createdAt: string;
}

export const paymentsApi = {
  /**
   * Prépare la cotisation (écran 31→32) : transaction PENDING.
   * - Cycle actif : montant fixé par le groupe (serveur), jamais envoyé.
   * - Cagnotte d'évènement (eventId, écran 56) : montant libre optionnel —
   *   la suggestion de l'évènement reste le défaut côté UI.
   */
  prepareContribution: (
    groupId: string,
    provider: MobileMoneyProvider,
    eventId?: string,
    amount?: number,
  ) =>
    apiClient.post<PreparedPaymentDto>('/payments/prepare', {
      groupId,
      provider,
      eventId,
      amount,
    }),

  /** Déclenche la collecte Mobile Money auprès de l'agrégateur (écran 32→33). */
  initiate: (
    transactionId: string,
    provider: MobileMoneyProvider,
    amount: number,
  ) =>
    apiClient.post<LedgerTransactionDto>('/payments/initiate', {
      transactionId,
      provider,
      amount,
    }),

  /** Moyens de paiement liés (écran 34). */
  listMethods: () => apiClient.get<PaymentMethodDto[]>('/payments/methods'),

  /** Ajoute un moyen de paiement (écran 35-37). */
  addMethod: (data: unknown) => apiClient.post<PaymentMethodDto>('/payments/methods', data),

  /** Statut d'une transaction du ledger (écran 33 : polling jusqu'à confirmation). */
  getTransaction: (id: string) =>
    apiClient.get<LedgerTransactionDto>(`/transactions/${id}`),
};
