import { apiClient } from '../api-client';

/** Échéance d'un prêt — échéancier (écrans 59-64) et remboursement. */
export interface LoanInstallmentDto {
  id: string;
  installmentNumber: number;
  /** Part du capital (Decimal en chaîne). */
  principal: string;
  /** Intérêts (Decimal en chaîne). */
  interest: string;
  total: string;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'LATE' | string;
  paidAt: string | null;
}

/** Prêt interne avec votes et échéancier — écrans 57-65. */
export interface LoanDto {
  id: string;
  groupId: string;
  borrowerId: string;
  amount: string;
  interestRate: number | null;
  durationMonths: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'REPAID' | 'REJECTED' | 'LATE' | string;
  guarantorId: string | null;
  signedAt: string | null;
  createdAt: string;
  votes: { id: string; voterId: string; approve: boolean; createdAt: string }[];
  installments: LoanInstallmentDto[];
  borrower: { id: string; fullName: string | null };
}

/** Réponse de POST /loans — prêt créé + aperçu de l'échéancier (écran 58). */
export interface LoanRequestResultDto {
  loan: LoanDto;
  schedulePreview: {
    installmentNumber: number;
    total: string;
    dueDate: string;
  }[];
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

  /** Prêts d'un groupe (demandes à valider incluses). */
  listForGroup: (groupId: string) =>
    apiClient.get<LoanDto[]>(`/loans/group/${groupId}`),

  /** Écran 57 — mes prêts (actifs + soldés, tous groupes). */
  listMine: () => apiClient.get<LoanDto[]>('/loans/me'),

  /** Détail d'un prêt (écrans 59-64 : votes, échéancier, contrat). */
  getOne: (id: string) => apiClient.get<LoanDto>(`/loans/${id}`),

  /** Écran 63 — signer le contrat (emprunteur). */
  signContract: (loanId: string) =>
    apiClient.post<LoanDto>(`/loans/${loanId}/sign`),

  /** Écran 65 — préparer le remboursement d'une échéance (transaction PENDING). */
  prepareRepayment: (loanId: string, installmentNumber: number) =>
    apiClient.post<{ transactionId: string; amount: string }>(
      `/loans/${loanId}/repay?installment=${installmentNumber}`,
    ),
};
