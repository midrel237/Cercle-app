import { apiClient } from '../api-client';

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
  }) => apiClient.post('/loans', data),

  /** Écran 59 — voter sur une demande (Refuser / Approuver). */
  vote: (loanId: string, approve: boolean) =>
    apiClient.post(`/loans/${loanId}/vote`, { approve }),

  /** Prêts d'un groupe (demandes à valider incluses). */
  listForGroup: (groupId: string) => apiClient.get(`/loans/group/${groupId}`),

  /** Écran 57 — mes prêts (actifs + soldés, tous groupes). */
  listMine: () => apiClient.get('/loans/me'),

  /** Détail d'un prêt (écrans 59-64 : votes, échéancier, contrat). */
  getOne: (id: string) => apiClient.get(`/loans/${id}`),

  /** Écran 63 — signer le contrat (emprunteur). */
  signContract: (loanId: string) => apiClient.post(`/loans/${loanId}/sign`),

  /** Écran 65 — préparer le remboursement d'une échéance (transaction PENDING). */
  prepareRepayment: (loanId: string, installmentNumber: number) =>
    apiClient.post(`/loans/${loanId}/repay?installment=${installmentNumber}`),
};
