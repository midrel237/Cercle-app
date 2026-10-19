import { apiClient } from '../api-client';

export type GroupEventType = 'DEUIL' | 'ANNIVERSAIRE' | 'NAISSANCE' | 'MARIAGE' | 'MALADIE' | 'AUTRE';

/** Évènement communautaire / cagnotte (écran 54-56). */
export interface GroupEventDto {
  id: string;
  groupId: string;
  type: GroupEventType | string;
  customLabel: string | null;
  description: string | null;
  /** Montant suggéré par cotation (Decimal sérialisé en chaîne). */
  suggestedAmount: string;
  /** Total collecté (transactions CONFIRMED). */
  collectedAmount: string;
  status: 'OPEN' | 'CLOSED' | string;
  createdBy: string;
  beneficiaryUserId: string;
  createdAt: string;
}

export const eventsApi = {
  /** Écran 54 — évènements du groupe (cagnottes OPEN + CLOSED). */
  listForGroup: (groupId: string) =>
    apiClient.get<GroupEventDto[]>(`/events/group/${groupId}`),

  /** Écran 56 — détail d'une cagnotte (collecté, contributeurs, en attente). */
  getOne: (eventId: string) => apiClient.get<GroupEventDto>(`/events/${eventId}`),

  /** Écran 55 — créer un évènement. */
  create: (data: {
    groupId: string;
    type: GroupEventType;
    customLabel?: string;
    beneficiaryUserId: string;
    description?: string;
    suggestedAmount?: number;
  }) => apiClient.post<GroupEventDto>('/events', data),

  /** Écran 56 — déclarer/ajuster sa cotisation (le paiement passe par /payments/prepare). */
  contribute: (eventId: string, amount: number) =>
    apiClient.post<GroupEventDto>(`/events/${eventId}/contribute`, { amount }),

  /** Clôturer une cagnotte (bénéficiaire ou auteur uniquement). */
  close: (eventId: string) => apiClient.post<GroupEventDto>(`/events/${eventId}/close`),
};
