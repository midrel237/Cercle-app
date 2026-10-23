import { apiClient } from '../api-client';

export type KycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

/** Réponse de GET /kyc/me/status. */
export interface KycStatusDto {
  status: KycStatus;
  /** Date de vérification (ISO) — affichée sur l'écran 14 « Vérifié le ». */
  verifiedAt: string | null;
}

// Endpoints du module backend apps/backend/src/kyc (flux Didit hébergé) :
//   POST /kyc/me/session  -> { sessionUrl }  (session de vérification Didit)
//   GET  /kyc/me/status   -> KycStatusDto     (polling après le retour callback)
export const kycApi = {
  createSession: (callbackUrl?: string) =>
    apiClient.post<{ sessionUrl: string }>('/kyc/me/session', { callbackUrl }),
  getStatus: () => apiClient.get<KycStatusDto>('/kyc/me/status'),
};
