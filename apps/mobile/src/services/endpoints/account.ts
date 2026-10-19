import { apiClient } from '../api-client';

export type HistoryFilter = 'ALL' | 'CONTRIBUTIONS' | 'LOANS';

/**
 * Transaction sérialisée — miroir exact de serializeTransaction
 * (apps/backend/src/transactions/transactions.service.ts) :
 * les montants Prisma Decimal deviennent des chaînes en JSON.
 */
export interface TransactionDto {
  id: string;
  groupId: string | null;
  groupName: string | null;
  cycleId: string | null;
  cycleNumber: number | null;
  type: string;
  status: string;
  amount: string;
  currency: string;
  isCredit: boolean;
  externalReference: string | null;
  provider: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

/** Écran 67 — historique groupé par jour. */
export interface HistoryDay {
  date: string;
  items: TransactionDto[];
}

/** Profil utilisateur — GET /users/me (écrans 72-73). */
export interface UserProfileDto {
  id: string;
  fullName: string | null;
  phoneNumber: string;
  trustScore: number;
  language: 'FR' | 'EN';
  activeGroups: number;
  createdAt: string;
}

/** Notification — écran 70. */
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export const transactionsApi = {
  /** Écran 67 — historique groupé par jour (filtre Tout/Cotisations/Prêts). */
  myHistory: (filter?: HistoryFilter) =>
    apiClient.get<HistoryDay[]>('/transactions/me', { params: { filter } }),

  /** Écran 68 — détail d'une de mes transactions. */
  getOne: (id: string) => apiClient.get<TransactionDto>(`/transactions/${id}`),
};

export const usersApi = {
  /** Écran 72 — profil & fiabilité (score, groupes actifs, moyens de paiement). */
  getProfile: () => apiClient.get<UserProfileDto>('/users/me'),

  /** Écran 73 — modifier le profil (nom, langue). PATCH /users/me. */
  updateProfile: (data: { fullName?: string; language?: 'FR' | 'EN' }) =>
    apiClient.patch<UserProfileDto>('/users/me', data),
};

export const notificationsApi = {
  /** Écran 70 — mes notifications. */
  list: () => apiClient.get<NotificationDto[]>('/notifications'),

  /** Marquer une notification comme lue. */
  markRead: (id: string) => apiClient.patch<NotificationDto>(`/notifications/${id}/read`),
};
