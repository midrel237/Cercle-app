export type LoanStatus =
  | 'requested'
  | 'voting'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'repaid'
  | 'defaulted';

export interface Loan {
  id: string;
  groupId: string;
  borrowerId: string;
  amount: number; // FCFA
  interestRate: number; // % défini par le groupe, peut être 0
  status: LoanStatus;
  requestedAt: string;
  approvedAt?: string;
  dueDate?: string;
  contractId?: string;
}

export interface LoanRepaymentSchedule {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAt?: string;
  status: 'pending' | 'paid' | 'late';
}

export interface LoanVote {
  loanId: string;
  voterId: string;
  approve: boolean;
  votedAt: string;
}
