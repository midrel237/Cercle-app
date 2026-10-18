import { apiClient } from '../api-client';

export type GroupEventType = 'DEUIL' | 'ANNIVERSAIRE' | 'NAISSANCE' | 'MARIAGE' | 'MALADIE' | 'AUTRE';

export const eventsApi = {
  /** Écran 54 — évènements du groupe (cagnottes OPEN + CLOSED). */
  listForGroup: (groupId: string) => apiClient.get(`/events/group/${groupId}`),

  /** Écran 56 — détail d'une cagnotte (collecté, contributeurs, en attente). */
  getOne: (eventId: string) => apiClient.get(`/events/${eventId}`),

  /** Écran 55 — créer un évènement. */
  create: (data: {
    groupId: string;
    type: GroupEventType;
    customLabel?: string;
    beneficiaryUserId: string;
    description?: string;
    suggestedAmount?: number;
  }) => apiClient.post('/events', data),

  /** Écran 56 — déclarer/ajuster sa cotisation (le paiement passe par /payments/prepare). */
  contribute: (eventId: string, amount: number) =>
    apiClient.post(`/events/${eventId}/contribute`, { amount }),

  /** Clôturer une cagnotte (bénéficiaire ou auteur uniquement). */
  close: (eventId: string) => apiClient.post(`/events/${eventId}/close`),
};
