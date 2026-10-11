import { apiClient } from '../api-client';

export type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

// Endpoints du module backend apps/backend/src/kyc (flux Didit hébergé) :
//   POST /kyc/me/session  -> { sessionUrl }  (session de vérification Didit)
//   GET  /kyc/me/status   -> { status }       (polling après le retour deep link)
export const kycApi = {
  createSession: () =>
    apiClient.post<{ sessionUrl: string }>('/kyc/me/session'),
  getStatus: () => apiClient.get<{ status: KycStatus }>('/kyc/me/status'),
};
