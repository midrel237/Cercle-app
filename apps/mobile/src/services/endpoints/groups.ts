import { apiClient } from '../api-client';

export const groupsApi = {
  create: (data: unknown) => apiClient.post('/groups', data),
  listMine: () => apiClient.get('/groups'),
  getOne: (id: string) => apiClient.get(`/groups/${id}`),

  /** Aperçu public par code d'invitation — écran 27 « GROUPE TROUVÉ ». */
  previewByInviteCode: (inviteCode: string) =>
    apiClient.post('/groups/preview', { inviteCode }),

  /** Adhésion par code — crée une demande en attente (écran 28). */
  join: (inviteCode: string) => apiClient.post('/groups/join', { inviteCode }),

  /** Décision admin sur une demande d'adhésion (écran 28, côté admin). */
  decideJoin: (groupId: string, memberId: string, approve: boolean) =>
    apiClient.post(`/groups/${groupId}/join-decision`, { memberId, approve }),

  /** Tirage au sort de l'ordre de rotation — écran 29. */
  drawRotation: (groupId: string) => apiClient.post(`/groups/${groupId}/rotation/draw`),

  /** Validation de l'ordre tiré — écran 30. */
  confirmRotation: (groupId: string) => apiClient.post(`/groups/${groupId}/rotation/confirm`),

  /** Démarrage du cycle 1 — écran 30. */
  startCycles: (groupId: string) => apiClient.post(`/groups/${groupId}/cycles/start`),
};
