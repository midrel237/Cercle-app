import { apiClient } from '../api-client';

export type MobileMoneyProvider = 'MTN_MOMO' | 'ORANGE_MONEY';

export const paymentsApi = {
  /** Prépare la cotisation du cycle actif (écran 31→32) : transaction PENDING. */
  prepareContribution: (
    groupId: string,
    provider: MobileMoneyProvider,
    eventId?: string,
  ) => apiClient.post('/payments/prepare', { groupId, provider, eventId }),

  /** Déclenche la collecte Mobile Money auprès de l'agrégateur (écran 32→33). */
  initiate: (
    transactionId: string,
    provider: MobileMoneyProvider,
    amount: number,
  ) => apiClient.post('/payments/initiate', { transactionId, provider, amount }),

  /** Moyens de paiement liés (écran 34). */
  listMethods: () => apiClient.get('/payments/methods'),

  /** Ajoute un moyen de paiement (écran 35-37). */
  addMethod: (data: unknown) => apiClient.post('/payments/methods', data),

  /** Statut d'une transaction du ledger (écran 33 : polling jusqu'à confirmation). */
  getTransaction: (id: string) => apiClient.get(`/transactions/${id}`),
};
