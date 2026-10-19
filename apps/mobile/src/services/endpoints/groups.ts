import { apiClient } from '../api-client';

/** Membre sérialisé — miroir de GroupsService.listMembers (écran 42). */
export interface GroupMemberRowDto {
  id: string;
  userId: string;
  fullName: string | null;
  role: 'ADMIN' | 'MEMBER' | string;
  rotationPosition: number | null;
  trustScore: number;
  isBeneficiary: boolean;
  contributionStatus: 'PAID' | 'LATE' | 'PENDING' | null;
  daysLate: number;
  joinedAt: string;
  exitStatus: string | null;
}

/** Demande d'adhésion en attente (admin) — écran 42. */
export interface PendingJoinRequestDto {
  id: string;
  userId: string;
  fullName: string | null;
  requestedAt: string;
}

/** Membre avec demande de sortie REQUESTED (admin) — écran 52. */
export interface ExitRequestMemberDto {
  id: string;
  userId: string;
  fullName: string | null;
}

/** Membre d'un groupe pour le tirage (écrans 29-30) — include user. */
export interface GroupMemberLiteDto {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER' | string;
  rotationPosition: number | null;
  joinStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  isActive: boolean;
  joinedAt: string;
  user: { id: string; fullName: string | null };
}

/** Groupe complet avec membres actifs — GET /groups/:id (écran 31). */
export interface GroupDto {
  id: string;
  name: string;
  mode: 'ROTATIVE' | 'INTERNAL_LOAN' | 'MIXED' | string;
  contributionAmount: string;
  periodicityDays: number;
  rotationOrderType: 'DRAW' | 'FIXED' | string;
  interestRate: number | null;
  penaltyRules: string | null;
  openToDiaspora: boolean;
  inviteCode: string;
  memberCount: number;
  cashierMemberId: string | null;
  /** Compte de dépôt du caissier (écran 49) — null si non enregistré. */
  depositAccountPhoneNumber: string | null;
  depositAccountProvider: string | null;
  members: GroupMemberLiteDto[];
  cycles: { id: string; cycleNumber: number; status: string }[];
  createdAt: string;
}

/** Réponse de GET /groups/:id/members — écrans 42, 44. */
export interface MembersListDto {
  isAdmin: boolean;
  inviteCode: string | null;
  memberCount: number;
  members: GroupMemberRowDto[];
  pendingJoinRequests: PendingJoinRequestDto[];
  exitRequests: ExitRequestMemberDto[];
}

/** Aperçu public par code d'invitation — écran 27. */
export interface GroupPreviewDto {
  id: string;
  name: string;
  contributionAmount: string;
  periodicityDays: number;
  mode: 'ROTATIVE' | 'INTERNAL_LOAN' | 'MIXED' | string;
  openToDiaspora: boolean;
  memberCount: number;
  alreadyJoined: number;
}

/** Statut de cotisation du cycle actif — écran 31. */
export interface CycleStatusDto {
  cycle: { id: string; cycleNumber: number; dueDate: string } | null;
  hasPaid: boolean;
  pendingCount: number;
  paidCount: number;
}

/** Message de la discussion — écran 41. */
export interface GroupMessageDto {
  id: string;
  groupId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; fullName: string | null };
}

/** Écran 46 — profil d'un membre (score de fiabilité, métriques du ledger). */
export interface MemberProfileDto {
  id: string;
  userId: string;
  fullName: string | null;
  trustScore: number;
  role: string;
  joinedAt: string;
  rotationPosition: number | null;
  outstandingDebt: string;
  exitStatus: string | null;
  contributionsPaid: number;
  contributionsPaidOnTime: number;
  totalCycles: number;
  receivedRotation: number | null;
  loansTotal: number;
  loansRepaid: number;
}

/** Écran 47 — résultat du rappel (canaux utilisés). */
export interface ReminderResultDto {
  channel: 'NOTIFICATION' | 'NOTIFICATION+SMS' | string;
  sentAt: string;
}

/** Écran 50 — aperçu de sortie : montants calculés par le serveur. */
export interface ExitPreviewDto {
  contributionsPaid: string;
  shareOfFund: string;
  outstandingDebt: string;
  netAmount: string;
}

export const groupsApi = {
  create: (data: {
    name: string;
    mode: string;
    contributionAmount: number;
    periodicityDays: number;
    rotationOrderType: string;
    interestRate?: number;
    penaltyRules?: string;
    openToDiaspora?: boolean;
  }) => apiClient.post<GroupDto>('/groups', data),
  listMine: () => apiClient.get<GroupDto[]>('/groups'),
  getOne: (id: string) => apiClient.get<GroupDto>(`/groups/${id}`),

  /** Aperçu public par code d'invitation — écran 27 « GROUPE TROUVÉ ». */
  previewByInviteCode: (inviteCode: string) =>
    apiClient.post<GroupPreviewDto>('/groups/preview', { inviteCode }),

  /** Adhésion par code — crée une demande en attente (écran 28). */
  join: (inviteCode: string) => apiClient.post('/groups/join', { inviteCode }),

  /** Décision admin sur une demande d'adhésion (écran 28, côté admin). */
  decideJoin: (groupId: string, memberId: string, approve: boolean) =>
    apiClient.post(`/groups/${groupId}/join-decision`, { memberId, approve }),

  /** Tirage au sort de l'ordre de rotation — écran 29. */
  drawRotation: (groupId: string) =>
    apiClient.post<GroupDto>(`/groups/${groupId}/rotation/draw`),

  /** Validation de l'ordre tiré — écran 30. */
  confirmRotation: (groupId: string) =>
    apiClient.post<GroupDto>(`/groups/${groupId}/rotation/confirm`),

  /** Démarrage du cycle 1 — écran 30. */
  startCycles: (groupId: string) =>
    apiClient.post(`/groups/${groupId}/cycles/start`),

  /** Statut de cotisation du cycle actif — écran 31 (détail du groupe). */
  getCycleStatus: (groupId: string) =>
    apiClient.get<CycleStatusDto>(`/groups/${groupId}/cycle-status`),

  /** Discussion du groupe — écran 41. */
  listMessages: (groupId: string, take?: number, before?: string) =>
    apiClient.get<GroupMessageDto[]>(`/groups/${groupId}/messages`, {
      params: { take, before },
    }),

  /** Envoi d'un message dans la discussion — écran 41. */
  sendMessage: (groupId: string, body: string) =>
    apiClient.post<GroupMessageDto>(`/groups/${groupId}/messages`, { body }),

  // ---- Phase 4 : membres & administration (écrans 42-53) ----

  /** Écran 42 — membres + demandes en attente (admin). */
  listMembers: (groupId: string) =>
    apiClient.get<MembersListDto>(`/groups/${groupId}/members`),

  /** Écran 46 — profil d'un membre (score de fiabilité, métriques). */
  getMemberProfile: (groupId: string, memberId: string) =>
    apiClient.get<MemberProfileDto>(`/groups/${groupId}/members/${memberId}`),

  /** Écran 47 — rappel manuel à un membre (notification + SMS optionnel). */
  sendReminder: (groupId: string, memberId: string, message?: string, alsoSms?: boolean) =>
    apiClient.post<ReminderResultDto>(`/groups/${groupId}/members/${memberId}/reminder`, {
      message,
      alsoSms,
    }),

  /** Écran 45 — retrait d'un membre par l'admin. */
  removeMember: (groupId: string, memberId: string) =>
    apiClient.post(`/groups/${groupId}/remove-member`, { memberId }),

  /** Écran 50 — aperçu de sortie volontaire (montants calculés serveur). */
  exitPreview: (groupId: string) =>
    apiClient.get<ExitPreviewDto>(`/groups/${groupId}/exit-preview`),

  /** Écran 52 — demandes de sortie en attente (admin) + montants. */
  listExitRequests: (groupId: string) =>
    apiClient.get<ExitRequestMemberDto[]>(`/groups/${groupId}/exit-requests`),

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
