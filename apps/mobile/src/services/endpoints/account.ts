import { apiClient } from '../api-client';

export type HistoryFilter = 'ALL' | 'CONTRIBUTIONS' | 'LOANS';

export const transactionsApi = {
  /** Écran 67 — historique groupé par jour (filtre Tout/Cotisations/Prêts). */
  myHistory: (filter?: HistoryFilter) =>
    apiClient.get('/transactions/me', { params: { filter } }),

  /** Écran 68 — détail d'une de mes transactions. */
  getOne: (id: string) => apiClient.get(`/transactions/${id}`),
};

export const usersApi = {
  /** Écran 72 — profil & fiabilité (score, groupes actifs, moyens de paiement). */
  getProfile: () => apiClient.get('/users/me'),

  /** Écran 73 — modifier le profil (nom, langue). */
  updateProfile: (data: { fullName?: string; language?: 'FR' | 'EN' }) =>
    apiClient.patch('/users/me', data),
};

export const notificationsApi = {
  /** Écran 70 — mes notifications. */
  list: () => apiClient.get('/notifications'),

  /** Marquer une notification comme lue. */
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
};
