import { apiClient } from '../api-client';

export const authApi = {
  register: (data: { phoneNumber: string; fullName: string; language: 'fr' | 'en' }) =>
    apiClient.post('/auth/register', data),
  requestOtp: (phoneNumber: string) => apiClient.post('/auth/otp/request', { phoneNumber }),
  verifyOtp: (phoneNumber: string, code: string) =>
    apiClient.post('/auth/otp/verify', { phoneNumber, code }),
  createPin: (phoneNumber: string, pin: string) =>
    apiClient.post('/auth/pin/create', { phoneNumber, pin }),
  login: (phoneNumber: string, pin: string) =>
    apiClient.post('/auth/login', { phoneNumber, pin }),
};
