import { apiClient } from '../api-client';

export type GroupEventType = 'DEUIL' | 'ANNIVERSAIRE' | 'NAISSANCE' | 'MARIAGE' | 'MALADIE' | 'AUTRE';

/** Contributeur d'une cagnotte (transaction CONFIRMED). */
export interface EventContributionDto {
  userId: string;
  fullName: string | null;
  /** Decimal sérialisé en chaîne. */
  amount: string;
}

/** Cagnotte sérialisée — miroir de EventsService.findForGroup/findOne. */
export interface GroupEventDto {
  id: string;
  groupId: string;
  type: GroupEventType | string;
  customLabel: string | null;
  description: string | null;
  suggestedAmount: string | null;
  status: 'OPEN' | 'CLOSED' | string;
  createdAt: string;
  closedAt: string | null;
  beneficiary: { id: string; fullName: string | null };
  createdBy: { id: string; fullName: string | null };
  collectedAmount: number;
  contributorsCount: number;
  remainingMembers: number;
  contributions: EventContributionDto[];
  /** Écran 56 seulement : membres actifs n'ayant pas encore cotisé. */
  waitingMembers?: { userId: string; fullName: string | null }[];
}

/** Réponse de GET /events/group/:groupId — écran 54. */
export interface EventsForGroupDto {
  activeMembers: number;
  events: GroupEventDto[];
}

export const eventsApi = {
  /** Écran 54 — évènements du groupe (cagnottes OPEN + CLOSED). */
  listForGroup: (groupId: string) =>
    apiClient.get<EventsForGroupDto>(`/events/group/${groupId}`),

  /** Écran 56 — détail d'une cagnotte (collecté, contributeurs, en attente). */
  getOne: (eventId: string) => apiClient.get<GroupEventDto>(`/events/${eventId}`),

  /** Écran 55 — créer un évènement (GroupEvent Prisma brut). */
  create: (data: {
    groupId: string;
    type: GroupEventType;
    customLabel?: string;
    beneficiaryUserId: string;
    description?: string;
    suggestedAmount?: number;
  }) =>
    apiClient.post<{
      id: string;
      groupId: string;
      type: string;
      customLabel: string | null;
      description: string | null;
      suggestedAmount: string | null;
      status: string;
      beneficiaryUserId: string;
      createdById: string;
      createdAt: string;
    }>('/events', data),

  /** Écran 56 — déclarer/ajuster sa cotisation (le paiement passe par /payments/prepare). */
  contribute: (eventId: string, amount: number) =>
    apiClient.post<{ id: string; eventId: string; userId: string; amount: string }>(
      `/events/${eventId}/contribute`,
      { amount },
    ),

  /** Clôturer une cagnotte (bénéficiaire ou auteur uniquement). */
  close: (eventId: string) =>
    apiClient.post<{ id: string; status: string; closedAt: string }>(
      `/events/${eventId}/close`,
    ),
};
