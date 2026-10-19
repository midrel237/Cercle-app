import { apiClient } from '../api-client';

/**
 * Miroirs des sérialiseurs de LoansService (loans.service.ts).
 * Decimal Prisma → string en JSON, DateTime → ISO string.
 */

export type LoanStatus = 'REQUESTED' | 'VOTING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'REPAID' | 'DEFAULTED';

/** Échéance persistée — miroir du modèle LoanRepaymentSchedule. */
export interface LoanInstallmentDto {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  /** Decimal → string. */
  amount: string;
  paidAt: string | null;
  status: 'PENDING' | 'PAID' | 'LATE';
}

/** Vote d'un membre — miroir du modèle LoanVote (include voter). */
export interface LoanVoteDto {
  id: string;
  loanId: string;
  voterId: string;
  approve: boolean;
  votedAt: string;
  voter: { id: string; fullName: string | null };
}

/** Contrat — miroir du modèle LoanContract. */
export interface LoanContractDto {
  id: string;
  loanId: string;
  contractPdfUrl: string | null;
  signedByBorrower: boolean;
  signedAt: string | null;
  createdAt: string;
}

/** Prêt complet (détail/findOne) — miroir de LoansService.findOne. */
export interface LoanDto {
  id: string;
  groupId: string;
  borrowerId: string;
  amount: string;
  interestRate: string;
  status: LoanStatus;
  requestedAt: string;
  approvedAt: string | null;
  dueDate: string | null;
  borrower: { id: string; fullName: string | null };
  votes: LoanVoteDto[];
  repaymentSchedule: LoanInstallmentDto[];
  contract: LoanContractDto | null;
}

/** Champs calculés ajoutés par findOne (écrans 59, 64). */
export interface LoanDetailDto extends LoanDto {
  majorityRequired: number;
  approvals: number;
  rejections: number;
  activeMembers: number;
}

/** Échéance de l'aperçu prévisionnel (request) — pas de status/id. */
export interface SchedulePreviewDto {
  installmentNumber: number;
  dueDate: string;
  amount: number;
}

/** Réponse de POST /loans — prêt créé + échéancier prévisionnel (écran 58). */
export interface LoanRequestResultDto {
  loan: LoanDto;
  schedulePreview: SchedulePreviewDto[];
}

/** Prêt résumé (listMine) — miroir de LoansService.findMine (écran 57). */
export interface MyLoanRowDto {
  id: string;
  groupId: string;
  groupName: string;
  amount: string;
  interestRate: string;
  status: LoanStatus;
  requestedAt: string;
  approvedAt: string | null;
  contractSigned: boolean;
  installmentsPaid: number;
  installmentsTotal: number;
  remainingAmount: number;
  totalWithInterest: number;
  nextDueDate: string | null;
  nextInstallmentAmount: string | null;
}

/** Transaction brute renvoyée par prepareRepayment (modèle LedgerTransaction). */
export interface RepaymentTransactionDto {
  id: string;
  groupId: string;
  userId: string;
  type: string;
  amount: string;
  currency: string;
  amountXaf: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: string;
  confirmedAt: string | null;
  cycleId?: string | null;
  provider?: string | null;
  externalReference?: string | null;
}

export const loansApi = {
  /**
   * Écran 58 — demander un prêt : montant, durée (1/3/6 mois), motif,
   * garant optionnel. Renvoie { loan, schedulePreview }.
   */
  request: (data: {
    groupId: string;
    amount: number;
    durationMonths: 1 | 3 | 6;
    reason: string;
    guarantorId?: string;
  }) => apiClient.post<LoanRequestResultDto>('/loans', data),

  /** Écran 59 — voter sur une demande (Refuser / Approuver). */
  vote: (loanId: string, approve: boolean) =>
    apiClient.post<LoanDto>(`/loans/${loanId}/vote`, { approve }),

  /** Prêts d'un groupe (demandes à valider incluses) — Prisma brut include. */
  listForGroup: (groupId: string) =>
    apiClient.get<LoanDto[]>(`/loans/group/${groupId}`),

  /** Écran 57 — mes prêts (actifs + soldés) : lignes résumées. */
  listMine: () => apiClient.get<MyLoanRowDto[]>('/loans/me'),

  /** Détail d'un prêt — findOne + compteurs de votes (écrans 59-64). */
  getOne: (id: string) => apiClient.get<LoanDetailDto>(`/loans/${id}`),

  /** Écran 63 — signer le contrat (emprunteur). */
  signContract: (loanId: string) =>
    apiClient.post<LoanDto>(`/loans/${loanId}/sign`),

  /**
   * Écran 65 — préparer le remboursement : crée la transaction
   * LOAN_REPAYMENT PENDING (Prisma brut, miroir de LedgerTransaction).
   */
  prepareRepayment: (loanId: string, installmentNumber: number) =>
    apiClient.post<RepaymentTransactionDto>(
      `/loans/${loanId}/repay?installment=${installmentNumber}`,
    ),
};
