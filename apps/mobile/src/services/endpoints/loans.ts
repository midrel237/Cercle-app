import { apiClient } from '../api-client';

export const loansApi = {
  request: (groupId: string, amount: number) => apiClient.post('/loans', { groupId, amount }),
  vote: (loanId: string, approve: boolean) => apiClient.post(`/loans/${loanId}/vote`, { approve }),
  listForGroup: (groupId: string) => apiClient.get(`/loans/group/${groupId}`),
  getOne: (id: string) => apiClient.get(`/loans/${id}`),
};
