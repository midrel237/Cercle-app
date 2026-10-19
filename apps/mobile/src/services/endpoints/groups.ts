import { apiClient } from '../api-client';

/**
 * Types miroirs des sérialiseurs backend (groups.service.ts) —
 * Decimal Prisma → string en JSON, DateTime → ISO string.
 */

export type GroupMode = 'ROTATIVE' | 'INTERNAL_LOAN' | 'MIXED';
export type GroupMemberRole = 'ADMIN' | 'CASHIER' | 'MEMBER';
export type ContributionStatus = 'PAID' | 'PENDING' | 'LATE';
export type ExitStatus = 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED';

/** Membre sérialisé — miroir de GroupsService.listMembers (écran 42). */
export interface GroupMemberRowDto {
  id: string;
  userId: string;
  fullName: string | null;
  role: GroupMemberRole;
  rotationPosition: number | null;
  trustScore: number;
  isBeneficiary: boolean;
  contributionStatus: ContributionStatus | null;
  daysLate: number;
  joinedAt: string;
  exitStatus: ExitStatus;
}

/** Demande d'adhésion en attente (admin) — écran 42. */
export interface PendingJoinRequestDto {
  id: string;
  userId: string;
  fullName: string | null;
  requestedAt: string | null;
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
  role: GroupMemberRole;
  rotationPosition: number | null;
  joinStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  joinedAt: string;
  user: { id: string; fullName: string | null };
}

/** Groupe complet — miroir du modèle Prisma Group (écran 31). */
export interface GroupDto {
  id: string;
  name: string;
  mode: GroupMode;
  /** Decimal → string. */
  contributionAmount: string;
  periodicityDays: number;
  rotationOrderType: 'DRAW' | 'FIXED';
  penaltyRules: string | null;
  /** Decimal → string. */
  interestRate: string;
  openToDiaspora: boolean;
  inviteCode: string;
  memberCount: number;
  cashierMemberId: string | null;
  /** Compte de dépôt du caissier (écran 49) — null si non enregistré. */
  depositAccountProvider: string | null;
  depositAccountPhoneNumber: string | null;
  depositAccountRegisteredAt: string | null;
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
  mode: GroupMode;
  openToDiaspora: boolean;
  memberCount: number;
  alreadyJoined: number;
}

/** Membre du cycle actif — miroir de getCycleStatus (écran 31). */
export interface CycleStatusMemberDto {
  id: string;
  userId: string;
  fullName: string | null;
  role: GroupMemberRole;
  isBeneficiary: boolean;
  contributionStatus: ContributionStatus;
}

/** Réponse de GET /groups/:id/cycle-status — écran 31. */
export interface CycleStatusDto {
  cycle: {
    id: string;
    cycleNumber: number;
    dueDate: string;
    /** Decimal → string. */
    expectedAmount: string | null;
    beneficiaryUserId: string;
  } | null;
  contributionAmount: string;
  members: CycleStatusMemberDto[];
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

/** Écran 46 — profil d'un membre : miroir exact de getMemberProfile. */
export interface MemberProfileDto {
  id: string;
  userId: string;
  fullName: string | null;
  trustScore: number;
  role: GroupMemberRole;
  joinedAt: string;
  rotationPosition: number | null;
  /** Decimal → string. */
  outstandingDebt: string;
  exitStatus: ExitStatus;
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

/** Écran 50 — miroir exact de exitPreview. */
export interface ExitPreviewDto {
  rotationReceived: boolean;
  rotationCycleNumber: number | null;
  contributionsPaid: string;
  outstandingDebt: string;
  amountToRefund: string;
  amountToSettle: string;
}

/** Écran 52 — miroir exact de listExitRequests. */
export interface ExitRequestRowDto {
  memberId: string;
  userId: string;
  fullName: string | null;
  requestedAt: string | null;
  reason: string | null;
  rotationReceived: boolean;
  amountToRefund: string;
  amountToSettle: string;
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

  /** Validation de l'ordre tiré — écran 30. ESLint exhaustive-deps OK. */
  confirmRotation: (groupId: string) =>
    apiClient.post<GroupDto>(`/groups/${groupId}/rotation/confirm`),

  /** Démarrage du cycle 1 — écran 30. */
  startCycles: (groupId: string) =>
    apiClient.post(`/groups/${groupId}/cycles/start`),

  /** Statut de cotisation du cycle actif — écran .tsx (détail du groupe). */
  getCycleStatus: (groupId: string) =>
    apiClient.get<CycleStatusDto>(`/groups/${groupId}/cycle-status`),

  /** Discussion du groupe — écran 41. */
  listMessages: (groupId: string, take?: number, before?: string) =>
    apiClient.get<GroupMessageDto[]>(`/groups/${groupId}/messages`, {
      params: { take, before },
    }),

  /** Envoi d'un message dans la discussion — écran 41. */
  sendMessage: (groupId: string, stringBody: string) =>
    apiClient.post<GroupMessageDto>(`/groups/${groupId}/messages`, {
      body: stringBody,
    }),

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
  `{memberId: string}`: undefined,
  removeMember: (groupId: string, memberId: string) =>
    apiClient.post(`/groups/${groupId}/remove-member`, { memberId }),

  /** Écran 50 — aperçu de sortie volontaire (montants calculés serveur). */
  exitPreview: (groupId: string) =>
    apiClient.get<ExitPreviewDto>(`/groups/${groupId}/exit-preview`),

  /** Écran 52 — demandes de sortie en attente (admin) + montants. */
  listExitRequests: (groupId: string) =>
    apiClient.get<ExitRequestRowDto[]>(`/groups/${groupId}/exit-requests`),

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
