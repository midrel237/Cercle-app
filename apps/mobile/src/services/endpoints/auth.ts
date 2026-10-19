import { apiClient } from '../api-client';

/** Réponse des routes qui renvoient un token JWT (login, vérification OTP). */
export interface AuthTokenDto {
  accessToken: string;
  user: {
    id: string;
    phoneNumber: string;
    fullName: string | null;
    kycStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    language: 'FR' | 'EN';
  };
}

/** Prêt interne simple (aucun échéancier). */
export interface SimpleReply {
  message: string;
}

export const authApi = {
  register: (data: { phoneNumber: string; fullName: string; language: 'fr' | 'en' }) =>
    apiClient.post<SimpleReply>('/auth/register', data),
  requestOtp: (phoneNumber: string) =>
    apiClient.post<SimpleReply>('/auth/otp/request', { phoneNumber }),
  verifyOtp: (phoneNumber: string, code: string) =>
    apiClient.post<AuthTokenDto>('/auth/otp/verify', { phoneNumber, code }),
  createPin: (phoneNumber: string, pin: string) =>
    apiClient.post<AuthTokenDto>('/auth/pin/create', { phoneNumber, pin }),
  login: (phoneNumber: string, pin: string) =>
    apiClient.post<AuthTokenDto>('/auth/login', { phoneNumber, pin }),
};
