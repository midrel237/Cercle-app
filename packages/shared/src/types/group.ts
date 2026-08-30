export type GroupMode = 'rotative' | 'internal_loan' | 'mixed';
export type GroupMemberRole = 'admin' | 'cashier' | 'member';
export type RotationOrderType = 'draw' | 'fixed';
export type GroupMemberExitStatus = 'none' | 'requested' | 'approved' | 'rejected';

/**
 * Compte de dépôt du groupe : compte Mobile Money du caissier utilisé
 * comme point de collecte des cotisations avant reversement au
 * bénéficiaire. Reste la propriété du caissier — la plateforme ne détient
 * jamais les fonds (cahier des charges §7, Option A).
 */
export interface DepositAccount {
  provider: 'mtn_momo' | 'orange_money';
  phoneNumber: string;
  registeredAt: string;
}

export interface Group {
  id: string;
  name: string;
  mode: GroupMode;
  contributionAmount: number; // en FCFA
  periodicityDays: number; // ex: 7, 14, 30
  memberCount: number;
  rotationOrderType: RotationOrderType;
  penaltyRules?: string;
  /** Autorise les membres de la diaspora à rejoindre et cotiser depuis
   * l'étranger (carte bancaire / virement, conversion de devise). */
  openToDiaspora: boolean;
  inviteCode: string;
  createdBy: string; // userId
  createdAt: string;
  cashierMemberId?: string; // GroupMember.id du caissier désigné
  depositAccount?: DepositAccount;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: string;
  rotationPosition?: number;
  isActive: boolean;
  /** Sortie volontaire (distincte d'une exclusion par l'admin) : toujours
   * soumise à validation. */
  exitStatus: GroupMemberExitStatus;
  exitRequestedAt?: string;
  exitReason?: string;
  exitDecidedAt?: string;
  /** Dette envers le groupe : alimentée par un retard de cotisation non
   * régularisé (déduit ensuite de son propre tour de rotation) ou par un
   * solde à rembourser en cas de sortie après réception de son tour. */
  outstandingDebt: number;
}

export interface CycleStatus {
  groupId: string;
  cycleNumber: number;
  beneficiaryUserId: string;
  dueDate: string;
  memberPaymentStatus: Record<string, 'paid' | 'late' | 'pending'>;
  /** Montant théorique de la cagnotte, avant déduction. */
  expectedAmount?: number;
  /** Somme déduite au titre de la dette accumulée du bénéficiaire. */
  deductedAmount: number;
  /** Montant réellement versé = expectedAmount - deductedAmount. */
  paidOutAmount?: number;
}
