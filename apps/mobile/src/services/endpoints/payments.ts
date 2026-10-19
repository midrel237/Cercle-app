import { apiClient } from '../api-client';

export type MobileMoneyProvider = 'MTN_MOMO' | 'ORANGE_MONEY';

/**
 * Transaction du ledger — miroir du modèle Prisma LedgerTransaction
 * (les Decimal deviennent des chaînes en JSON). Renvoyée à plat par
 * POST /payments/prepare et GET /transactions/:id.
 */
export interface LedgerTransactionDto {
  id: string;
  groupId: string | null;
  cycleId: string | null;
  userId: string;
  type: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | string;
  amount: string;
  currency: string;
  amountXaf: string;
  provider: MobileMoneyProvider | null;
  externalReference: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

/** Moyen de paiement — miroir du modèle Prisma PaymentMethod (écran 34). */
export interface PaymentMethodDto {
  id: string;
  type: 'MOBILE_MONEY' | 'BANK_CARD' | 'BANK_TRANSFER' | string;
  provider: string | null;
  phoneNumber: string | null;
  cardToken: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  bankName: string | null;
  bankCountry: string | null;
  ibanLast4: string | null;
  isDefault: boolean;
  createdAt: string;
}

/** Réponse de l'agrégateur à POST /payments/initiate (écran 32→33). */
export interface InitiateResultDto {
  accepted: boolean;
  reference: string;
  message?: string;
}

export const paymentsApi = {
  /**
   * Prépare la cotisation (écran 31→32) : crée la transaction PENDING
   * (montant fixé par le serveur : celui du groupe ou de la cagnotte)
   * et la renvoie à plat — id + amount servent à initiate.
   * - Cycle actif : montant fixé par le groupe, jamais envoyé.
   * - Cagnotte d'évènement (eventId, écran 56) : montant libre optionnel.
   */
  prepareContribution: (
    groupId: string,
    provider: MobileMoneyProvider,
    eventId?: string,
    amount?: number,
  ) =>
    apiClient.post<LedgerTransactionDto>('/payments/prepare', {
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
    apiClient.post<InitiateResultDto>('/payments/initiate', {
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
