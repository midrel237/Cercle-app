export type GroupEventType =
  | 'deuil'
  | 'anniversaire'
  | 'naissance'
  | 'mariage'
  | 'maladie'
  | 'autre';

export type GroupEventStatus = 'open' | 'closed' | 'cancelled';

/**
 * Cagnotte ponctuelle liée à un évènement de vie d'un membre. Distincte du
 * cycle rotatif : tous les membres du groupe peuvent y cotiser librement
 * pour le bénéficiaire désigné.
 */
export interface GroupEvent {
  id: string;
  groupId: string;
  type: GroupEventType;
  customLabel?: string; // libellé libre si type = 'autre'
  beneficiaryUserId: string;
  description?: string;
  suggestedAmount?: number; // FCFA
  status: GroupEventStatus;
  createdBy: string; // userId
  createdAt: string;
  closedAt?: string;
}

export interface EventContribution {
  id: string;
  eventId: string;
  userId: string;
  amount: number; // FCFA
  createdAt: string;
}
