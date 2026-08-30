import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'cercle_access_token';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function setStoredAccessToken(token: string) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearStoredAccessToken() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
