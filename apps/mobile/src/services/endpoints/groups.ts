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

  /** Statut de cotisation du cycle actif — écran 31 (détail du groupe). */
  getCycleStatus: (groupId: string) => apiClient.get(`/groups/${groupId}/cycle-status`),

  /** Discussion du groupe — écran 41. */
  listMessages: (groupId: string, take?: number, before?: string) =>
    apiClient.get(`/groups/${groupId}/messages`, {
      params: { take, before },
    }),

  /** Envoi d'un message dans la discussion — écran 41. */
  sendMessage: (groupId: string, body: string) =>
    apiClient.post(`/groups/${groupId}/messages`, { body }),

  // ---- Phase 4 : membres & administration (écrans 42-53) ----

  /** Écran 42 — membres + demandes en attente (admin). */
  listMembers: (groupId: string) => apiClient.get(`/groups/${groupId}/members`),

  /** Écran 46 — profil d'un membre (score de fiabilité, métriques). */
  getMemberProfile: (groupId: string, memberId: string) =>
    apiClient.get(`/groups/${groupId}/members/${memberId}`),

  /** Écran 47 — rappel manuel à un membre (notification + SMS optionnel). */
  sendReminder: (groupId: string, memberId: string, message?: string, alsoSms?: boolean) =>
    apiClient.post(`/groups/${groupId}/members/${memberId}/reminder`, { message, alsoSms }),

  /** Écran 45 — retrait d'un membre par l'admin. */
  removeMember: (groupId: string, memberId: string) =>
    apiClient.post(`/groups/${groupId}/remove-member`, { memberId }),

  /** Écran 50 — aperçu de sortie volontaire (montants calculés serveur). */
  exitPreview: (groupId: string) => apiClient.get(`/groups/${groupId}/exit-preview`),

  /** Écran 52 — demandes de sortie en attente (admin) + montants. */
  listExitRequests: (groupId: string) => apiClient.get(`/groups/${groupId}/exit-requests`),

  /** Désignation du caissier (admin) — écran 48. */
  assignCashier: (groupId: string, memberId: string) =>
    apiClient.post(`/groups/${groupId}/cashier`, { memberId }),

  /** Compte de dépôt du groupe (caissier) — écran 49. */
  registerDepositAccount: (groupId: string, provider: string, phoneNumber: string) =>
    apiClient.post(`/groups/${groupId}/deposit-account`, { provider, phoneNumber }),

  /** Sortie volontaire — écran 50. */
  requestExit: (groupId: string, reason: string) =>
    apiClient.post(`/groups/${groupId}/exit-request`, { reason }),

  /** Décision admin sur une demande de sortie — écran 52. */
  decideExit: (groupId: string, memberId: string, approve: boolean) =>
    apiClient.post(`/groups/${groupId}/exit-decision`, { memberId, approve }),
};
