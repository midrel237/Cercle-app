import { apiClient } from '../api-client';

export const groupsApi = {
  create: (data: unknown) => apiClient.post('/groups', data),
  listMine: () => apiClient.get('/groups'),
  getOne: (id: string) => apiClient.get(`/groups/${id}`),
  join: (inviteCode: string) => apiClient.post('/groups/join', { inviteCode }),
};
